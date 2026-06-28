import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const [matchesRes, picksRes, resultsRes] = await Promise.all([
    query(`SELECT id, round, match_number, team1, team2, match_date, locked, picks_open_from FROM knockout_matches ORDER BY
           CASE round WHEN 'r32' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 3 WHEN 'sf' THEN 4 WHEN '3rd' THEN 5 WHEN 'final' THEN 6 END,
           match_number`),
    query(`SELECT match_id, pick FROM knockout_picks WHERE user_id = $1`, [session.user.id]),
    query(`SELECT match_id, winner, result_90 FROM knockout_results`),
  ]);

  return NextResponse.json({
    matches: matchesRes.rows,
    picks: picksRes.rows,
    results: resultsRes.rows,
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { matchId, pick } = await req.json();
  if (!matchId || !['1','x','2'].includes(pick)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  // Check user is inscribed
  const userRes = await query('SELECT paid_knockout FROM users WHERE id = $1', [session.user.id]);
  if (!userRes.rows[0]?.paid_knockout) return NextResponse.json({ error: 'Inscripción requerida' }, { status: 403 });

  const matchRes = await query(
    `SELECT km.id, km.team1, km.team2, km.locked, km.picks_open_from, km.locks_at, kr.result_90
     FROM knockout_matches km
     LEFT JOIN knockout_results kr ON kr.match_id = km.id
     WHERE km.id = $1`,
    [matchId]
  );
  const m = matchRes.rows[0];
  if (!m) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
  if (m.locked || m.result_90) return NextResponse.json({ error: 'Partido cerrado' }, { status: 403 });
  if (m.locks_at && new Date(m.locks_at) <= new Date()) return NextResponse.json({ error: 'El partido ya comenzó' }, { status: 403 });
  if (m.picks_open_from && new Date(m.picks_open_from) > new Date()) return NextResponse.json({ error: 'Picks aún no disponibles' }, { status: 403 });

  await query(
    `INSERT INTO knockout_picks (user_id, match_id, pick, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, match_id) DO UPDATE SET pick = EXCLUDED.pick, updated_at = NOW()`,
    [session.user.id, matchId, pick]
  );
  return NextResponse.json({ ok: true });
}
