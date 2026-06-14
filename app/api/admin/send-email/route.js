import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Resend } from 'resend';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { buildEmail, getUpcomingMatches, EMAIL_SUBJECT } from '@/lib/email';

const FROM = 'Polla Mundial 2026 <mundial@infrony.app>';
const TEST_RECIPIENT = 'infrony@gmail.com';

async function checkAdmin(session) {
  if (!session?.user?.isAdmin) return false;
  const res = await query('SELECT is_admin FROM users WHERE id = $1', [session.user.id]);
  return res.rows[0]?.is_admin === true;
}

// Pull everything needed and build a personalized payload per user.
async function buildPayloads() {
  const appUrl = process.env.NEXTAUTH_URL || 'https://mundial.infrony.app';
  const upcoming = getUpcomingMatches();

  const [lbRes, picksRes, gPicksRes] = await Promise.all([
    // Same scoring as /tabla, ordered so the row index gives the rank.
    query(`
      SELECT u.id, u.name, u.email, u.paid,
        COUNT(DISTINCT p.match_id) AS total_picks,
        COALESCE(SUM(CASE WHEN p.pick = mr.result THEN 1 ELSE 0 END), 0)
        + COALESCE((
            SELECT SUM(
              CASE WHEN gp2.first_team = gr2.first_team AND gp2.first_team IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN gp2.second_team = gr2.second_team AND gp2.second_team IS NOT NULL THEN 1 ELSE 0 END
            )
            FROM group_picks gp2
            LEFT JOIN group_results gr2 ON gr2.group_key = gp2.group_key
            WHERE gp2.user_id = u.id
          ), 0) AS total_pts
      FROM users u
      LEFT JOIN picks p ON p.user_id = u.id
      LEFT JOIN match_results mr ON mr.match_id = p.match_id
      GROUP BY u.id, u.name, u.email
      ORDER BY total_pts DESC, total_picks DESC
    `),
    query('SELECT user_id, match_id, pick FROM picks'),
    query('SELECT user_id, group_key, first_team, second_team FROM group_picks ORDER BY user_id, group_key'),
  ]);

  const rows = lbRes.rows;
  const totalUsers = rows.length;

  const picksByUser = {};
  picksRes.rows.forEach(p => {
    (picksByUser[p.user_id] ||= {})[p.match_id] = p.pick;
  });
  const gPicksByUser = {};
  gPicksRes.rows.forEach(g => {
    (gPicksByUser[g.user_id] ||= []).push(g);
  });

  return rows.map((u, i) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    paid: u.paid,
    html: buildEmail({
      name: u.name,
      points: Number(u.total_pts) || 0,
      rank: i + 1,
      totalUsers,
      matchPicksCount: Number(u.total_picks) || 0,
      groupPicks: gPicksByUser[u.id] || [],
      upcoming,
      picksMap: picksByUser[u.id] || {},
      appUrl,
    }),
  }));
}

// GET — preview the email that the current admin would receive.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!await checkAdmin(session)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  const payloads = await buildPayloads();
  const mine = payloads.find(p => String(p.id) === String(session.user.id)) || payloads[0];
  const recipients = payloads.filter(p => p.email && p.paid).length;

  return NextResponse.json({
    subject: EMAIL_SUBJECT,
    html: mine?.html || '',
    recipientCount: recipients,
    testRecipient: TEST_RECIPIENT,
    from: FROM,
  });
}

// POST — send. body: { test: boolean }
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!await checkAdmin(session)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Falta RESEND_API_KEY en el entorno' }, { status: 500 });
  }

  const { test = false } = await req.json().catch(() => ({}));
  const resend = new Resend(process.env.RESEND_API_KEY);
  const payloads = await buildPayloads();

  try {
    if (test) {
      // Send the admin's own personalized email to the test inbox.
      const mine = payloads.find(p => String(p.id) === String(session.user.id)) || payloads[0];
      if (!mine) return NextResponse.json({ error: 'No hay datos para previsualizar' }, { status: 400 });
      const { error } = await resend.emails.send({
        from: FROM,
        to: TEST_RECIPIENT,
        subject: `[PRUEBA] ${EMAIL_SUBJECT}`,
        html: mine.html,
      });
      if (error) return NextResponse.json({ error: error.message || 'Error de Resend' }, { status: 502 });
      return NextResponse.json({ ok: true, test: true, sent: 1, to: TEST_RECIPIENT });
    }

    // Real send only to participants who paid and have an email, in batches of 100.
    const recipients = payloads.filter(p => p.email && p.paid);
    if (recipients.length === 0) return NextResponse.json({ error: 'No hay participantes que hayan pagado con correo' }, { status: 400 });

    let sent = 0;
    const failures = [];
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100);
      const { error } = await resend.batch.send(
        chunk.map(p => ({ from: FROM, to: p.email, subject: EMAIL_SUBJECT, html: p.html }))
      );
      if (error) failures.push(error.message || 'Error de lote');
      else sent += chunk.length;
    }

    if (failures.length) {
      return NextResponse.json({ ok: false, sent, failures }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error inesperado' }, { status: 500 });
  }
}
