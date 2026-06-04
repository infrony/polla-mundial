import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { groups } from '@/lib/data';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const res = await query('SELECT group_key, first_team, second_team FROM group_picks WHERE user_id = $1', [session.user.id]);
  const picks = {};
  res.rows.forEach(r => { picks[r.group_key] = { first: r.first_team, second: r.second_team }; });
  return NextResponse.json(picks);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { groupKey, pos, team } = await req.json();
  if (!groupKey || !['first','second'].includes(pos)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  // Block if group already started
  const lockDate = groups[groupKey]?.lockDate;
  if (lockDate && new Date() >= new Date(lockDate)) {
    return NextResponse.json({ error: 'Este grupo ya no acepta cambios.' }, { status: 403 });
  }

  const col = pos === 'first' ? 'first_team' : 'second_team';
  await query(
    `INSERT INTO group_picks (user_id, group_key, ${col}, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, group_key) DO UPDATE SET ${col} = EXCLUDED.${col}, updated_at = NOW()`,
    [session.user.id, groupKey, team || null]
  );

  return NextResponse.json({ ok: true });
}
