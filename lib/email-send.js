import { Resend } from 'resend';
import { query } from './db';
import {
  buildEmail, buildKnockoutEmail, getUpcomingMatches,
  EMAIL_SUBJECT, KNOCKOUT_ROUNDS, knockoutRound, knockoutSubject,
} from './email';

export const FROM = 'Polla Mundial 2026 <mundial@infrony.app>';
export const TEST_RECIPIENT = 'infrony@gmail.com';

export function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY en el entorno');
  return new Resend(process.env.RESEND_API_KEY);
}

function appUrl() {
  return process.env.NEXTAUTH_URL || 'https://mundial.infrony.app';
}

// ─── Weekly group-stage summary ────────────────────────────────────────────

export async function buildWeeklyPayloads() {
  const url = appUrl();
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
      WHERE u.paid = TRUE
      GROUP BY u.id, u.name, u.email, u.paid
      ORDER BY total_pts DESC, total_picks DESC
    `),
    query('SELECT user_id, match_id, pick FROM picks'),
    query('SELECT user_id, group_key, first_team, second_team FROM group_picks ORDER BY user_id, group_key'),
  ]);

  const rows = lbRes.rows;
  const totalUsers = rows.length;

  const picksByUser = {};
  picksRes.rows.forEach(p => { (picksByUser[p.user_id] ||= {})[p.match_id] = p.pick; });
  const gPicksByUser = {};
  gPicksRes.rows.forEach(g => { (gPicksByUser[g.user_id] ||= []).push(g); });

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
      appUrl: url,
    }),
  }));
}

// ─── Knockout-phase recap ───────────────────────────────────────────────────

export async function buildKnockoutPayloads(roundKey) {
  const round = knockoutRound(roundKey);
  if (!round) throw new Error('Fase inválida');
  const url = appUrl();

  const [lbRes, matchesRes, resultsRes, picksRes] = await Promise.all([
    // Total knockout points per participant, ordered for ranking.
    query(`
      SELECT u.id, u.name, u.email, u.paid_knockout,
        COALESCE(SUM(CASE WHEN kp.pick = kr.winner THEN
          CASE km.round WHEN 'r32' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 4 WHEN 'sf' THEN 6 WHEN '3rd' THEN 8 WHEN 'final' THEN 8 ELSE 0 END
        ELSE 0 END), 0) AS ko_pts
      FROM users u
      LEFT JOIN knockout_picks kp ON kp.user_id = u.id
      LEFT JOIN knockout_matches km ON km.id = kp.match_id
      LEFT JOIN knockout_results kr ON kr.match_id = kp.match_id
      WHERE u.paid_knockout = TRUE
      GROUP BY u.id, u.name, u.email, u.paid_knockout
      ORDER BY ko_pts DESC
    `),
    query('SELECT id, round, match_number, team1, team2, match_date FROM knockout_matches ORDER BY match_number'),
    query('SELECT match_id, winner FROM knockout_results'),
    query('SELECT user_id, match_id, pick FROM knockout_picks'),
  ]);

  const participants = lbRes.rows;
  const totalParticipants = participants.length;

  const roundMatches = matchesRes.rows.filter(m => m.round === roundKey);
  const nextRound = KNOCKOUT_ROUNDS[KNOCKOUT_ROUNDS.findIndex(r => r.key === roundKey) + 1];
  const nextMatches = nextRound ? matchesRes.rows.filter(m => m.round === nextRound.key) : [];

  const results = {};
  resultsRes.rows.forEach(r => { results[r.match_id] = r.winner; });

  const picksByUser = {};
  picksRes.rows.forEach(p => { (picksByUser[p.user_id] ||= {})[p.match_id] = p.pick; });

  return participants.map((u, i) => {
    const picksMap = picksByUser[u.id] || {};
    const roundPoints = roundMatches.reduce(
      (sum, m) => sum + (picksMap[m.id] && results[m.id] && picksMap[m.id] === results[m.id] ? round.pts : 0), 0
    );
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      paid_knockout: u.paid_knockout,
      html: buildKnockoutEmail({
        name: u.name,
        roundLabel: round.label,
        roundPts: round.pts,
        roundMatches,
        picksMap,
        results,
        roundPoints,
        totalKoPoints: Number(u.ko_pts) || 0,
        rank: i + 1,
        totalParticipants,
        nextMatches,
        nextLabel: nextRound?.label,
        appUrl: url,
      }),
    };
  });
}

// ─── Sending ────────────────────────────────────────────────────────────────

// Send the same-subject batch to a list of { email, html } recipients.
export async function sendToRecipients(recipients, subject) {
  const resend = getResend();
  let sent = 0;
  const failures = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const { error } = await resend.batch.send(
      chunk.map(p => ({ from: FROM, to: p.email, subject, html: p.html }))
    );
    if (error) failures.push(error.message || 'Error de lote');
    else sent += chunk.length;
  }
  return { sent, failures };
}

export async function sendSingle(to, subject, html) {
  const resend = getResend();
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message || 'Error de Resend');
}

// ─── Sent-log (dedupe for automatic sends) ──────────────────────────────────

export async function ensureEmailLog() {
  await query(`
    CREATE TABLE IF NOT EXISTS email_log (
      kind       TEXT NOT NULL,
      key        TEXT NOT NULL,
      recipients INT  DEFAULT 0,
      sent_at    TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (kind, key)
    )
  `);
}

export async function sentLogKeys(kind) {
  await ensureEmailLog();
  const r = await query('SELECT key FROM email_log WHERE kind = $1', [kind]);
  return r.rows.map(x => x.key);
}

export async function markEmailSent(kind, key, recipients) {
  await query(
    'INSERT INTO email_log (kind, key, recipients) VALUES ($1, $2, $3) ON CONFLICT (kind, key) DO NOTHING',
    [kind, key, recipients]
  );
}

export { EMAIL_SUBJECT, knockoutSubject, knockoutRound, KNOCKOUT_ROUNDS };
