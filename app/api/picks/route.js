import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { TOURNAMENT_START } from '@/lib/data';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const res = await query('SELECT match_id, pick FROM picks WHERE user_id = $1', [session.user.id]);
  const picks = {};
  res.rows.forEach(r => { picks[r.match_id] = r.pick; });
  return NextResponse.json(picks);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { matchId, pick } = await req.json();
  if (!matchId || !['1','x','2'].includes(pick)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  if (new Date() >= new Date(TOURNAMENT_START)) {
    return NextResponse.json({ error: 'Las predicciones están cerradas.' }, { status: 403 });
  }

  await query(
    `INSERT INTO picks (user_id, match_id, pick, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, match_id) DO UPDATE SET pick = EXCLUDED.pick, updated_at = NOW()`,
    [session.user.id, matchId, pick]
  );

  return NextResponse.json({ ok: true });
}

// Batch save
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { picks } = await req.json();
  if (!picks || typeof picks !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  if (new Date() >= new Date(TOURNAMENT_START)) {
    return NextResponse.json({ error: 'Las predicciones están cerradas.', saved: 0 }, { status: 403 });
  }

  const valid = ['1','x','2'];
  const entries = Object.entries(picks).filter(([, v]) => valid.includes(v));

  for (const [matchId, pick] of entries) {
    await query(
      `INSERT INTO picks (user_id, match_id, pick, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, match_id) DO UPDATE SET pick = EXCLUDED.pick, updated_at = NOW()`,
      [session.user.id, Number(matchId), pick]
    );
  }

  return NextResponse.json({ ok: true, saved: entries.length });
}
