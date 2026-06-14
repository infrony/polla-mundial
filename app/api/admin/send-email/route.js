import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  buildWeeklyPayloads, buildKnockoutPayloads, sendToRecipients, sendSingle,
  EMAIL_SUBJECT, knockoutSubject, knockoutRound, KNOCKOUT_ROUNDS, TEST_RECIPIENT, FROM,
  sentLogKeys, markEmailSent,
} from '@/lib/email-send';

async function checkAdmin(session) {
  if (!session?.user?.isAdmin) return false;
  const res = await query('SELECT is_admin FROM users WHERE id = $1', [session.user.id]);
  return res.rows[0]?.is_admin === true;
}

// GET — preview. ?round=<key> previews a knockout phase, otherwise the weekly summary.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!await checkAdmin(session)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  const roundKey = new URL(req.url).searchParams.get('round');

  if (roundKey) {
    const round = knockoutRound(roundKey);
    if (!round) return NextResponse.json({ error: 'Fase inválida' }, { status: 400 });
    const payloads = await buildKnockoutPayloads(roundKey);
    const mine = payloads.find(p => String(p.id) === String(session.user.id)) || payloads[0];
    return NextResponse.json({
      subject: knockoutSubject(round.label),
      html: mine?.html || '',
      recipientCount: payloads.filter(p => p.email && p.paid_knockout).length,
      started: new Date() >= new Date(round.startsAt),
      startsAt: round.startsAt,
      testRecipient: TEST_RECIPIENT,
      from: FROM,
    });
  }

  const [payloads, koSent] = await Promise.all([buildWeeklyPayloads(), sentLogKeys('knockout')]);
  const mine = payloads.find(p => String(p.id) === String(session.user.id)) || payloads[0];
  const now = new Date();
  return NextResponse.json({
    subject: EMAIL_SUBJECT,
    html: mine?.html || '',
    recipientCount: payloads.filter(p => p.email && p.paid).length,
    testRecipient: TEST_RECIPIENT,
    from: FROM,
    rounds: KNOCKOUT_ROUNDS.map(r => ({
      key: r.key,
      label: r.label,
      started: now >= new Date(r.startsAt),
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      sent: koSent.includes(r.key),
    })),
  });
}

// POST — send. body: { test, round? }. With round → knockout phase; otherwise weekly.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!await checkAdmin(session)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Falta RESEND_API_KEY en el entorno' }, { status: 500 });
  }

  const { test = false, round: roundKey } = await req.json().catch(() => ({}));

  try {
    // ── Knockout phase ──
    if (roundKey) {
      const round = knockoutRound(roundKey);
      if (!round) return NextResponse.json({ error: 'Fase inválida' }, { status: 400 });
      if (new Date() < new Date(round.startsAt)) {
        return NextResponse.json({ error: `Esta fase aún no comienza (inicia ${round.startsAt}).` }, { status: 403 });
      }

      const payloads = await buildKnockoutPayloads(roundKey);
      const subject = knockoutSubject(round.label);

      if (test) {
        const mine = payloads.find(p => String(p.id) === String(session.user.id)) || payloads[0];
        if (!mine) return NextResponse.json({ error: 'No hay datos para previsualizar' }, { status: 400 });
        await sendSingle(TEST_RECIPIENT, `[PRUEBA] ${subject}`, mine.html);
        return NextResponse.json({ ok: true, test: true, sent: 1, to: TEST_RECIPIENT });
      }

      const recipients = payloads.filter(p => p.email && p.paid_knockout);
      if (recipients.length === 0) return NextResponse.json({ error: 'No hay participantes de eliminatorias con correo' }, { status: 400 });
      const { sent, failures } = await sendToRecipients(recipients, subject);
      if (failures.length) return NextResponse.json({ ok: false, sent, failures }, { status: 502 });
      await markEmailSent('knockout', roundKey, sent);
      return NextResponse.json({ ok: true, sent });
    }

    // ── Weekly group-stage summary ──
    const payloads = await buildWeeklyPayloads();

    if (test) {
      const mine = payloads.find(p => String(p.id) === String(session.user.id)) || payloads[0];
      if (!mine) return NextResponse.json({ error: 'No hay datos para previsualizar' }, { status: 400 });
      await sendSingle(TEST_RECIPIENT, `[PRUEBA] ${EMAIL_SUBJECT}`, mine.html);
      return NextResponse.json({ ok: true, test: true, sent: 1, to: TEST_RECIPIENT });
    }

    const recipients = payloads.filter(p => p.email && p.paid);
    if (recipients.length === 0) return NextResponse.json({ error: 'No hay participantes que hayan pagado con correo' }, { status: 400 });
    const { sent, failures } = await sendToRecipients(recipients, EMAIL_SUBJECT);
    if (failures.length) return NextResponse.json({ ok: false, sent, failures }, { status: 502 });
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Error inesperado' }, { status: 500 });
  }
}
