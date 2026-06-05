import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

async function checkAdmin(session) {
  if (!session?.user?.isAdmin) return false;
  const res = await query('SELECT is_admin FROM users WHERE id = $1', [session.user.id]);
  return res.rows[0]?.is_admin === true;
}

// GET: all users + their picks summary
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!await checkAdmin(session)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  const [users, picks, groupPicks, results, groupResults] = await Promise.all([
    query(`SELECT id, name, email, image, provider, is_admin, paid, created_at,
            (SELECT COUNT(*) FROM picks WHERE user_id = users.id) AS pick_count
           FROM users ORDER BY created_at DESC`),
    query(`SELECT p.user_id, p.match_id, p.pick
           FROM picks p ORDER BY p.user_id, p.match_id`),
    query(`SELECT gp.user_id, gp.group_key, gp.first_team, gp.second_team
           FROM group_picks gp ORDER BY gp.user_id, gp.group_key`),
    query(`SELECT match_id, result FROM match_results ORDER BY match_id`),
    query(`SELECT group_key, first_team, second_team FROM group_results ORDER BY group_key`),
  ]);

  return NextResponse.json({
    users: users.rows,
    picks: picks.rows,
    groupPicks: groupPicks.rows,
    results: results.rows,
    groupResults: groupResults.rows,
  });
}

// POST: save match result or group result
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!await checkAdmin(session)) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  const body = await req.json();

  if (body.type === 'match') {
    const { matchId, result } = body;
    if (!matchId || !['1','x','2',''].includes(result)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    if (result === '') {
      await query('DELETE FROM match_results WHERE match_id = $1', [matchId]);
    } else {
      await query(
        `INSERT INTO match_results (match_id, result, entered_by, entered_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (match_id) DO UPDATE SET result = EXCLUDED.result, entered_by = EXCLUDED.entered_by, entered_at = NOW()`,
        [matchId, result, session.user.id]
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'payment') {
    const { userId, paid } = body;
    if (!userId) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    await query('UPDATE users SET paid = $1 WHERE id = $2', [!!paid, userId]);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'group') {
    const { groupKey, firstTeam, secondTeam } = body;
    if (!groupKey) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    await query(
      `INSERT INTO group_results (group_key, first_team, second_team, entered_by, entered_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (group_key) DO UPDATE SET first_team = EXCLUDED.first_team, second_team = EXCLUDED.second_team, entered_by = EXCLUDED.entered_by, entered_at = NOW()`,
      [groupKey, firstTeam || null, secondTeam || null, session.user.id]
    );
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'knockout_match_setup') {
    const { matchId, team1, team2 } = body;
    if (!matchId) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    await query(
      `UPDATE knockout_matches SET team1 = $1, team2 = $2 WHERE id = $3`,
      [team1 || null, team2 || null, matchId]
    );
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'knockout_lock') {
    const { matchId, locked } = body;
    if (!matchId) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    await query(`UPDATE knockout_matches SET locked = $1 WHERE id = $2`, [!!locked, matchId]);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'knockout_result') {
    const { matchId, winner } = body;
    if (!matchId) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    if (!winner) {
      await query(`DELETE FROM knockout_results WHERE match_id = $1`, [matchId]);
    } else {
      await query(
        `INSERT INTO knockout_results (match_id, winner, entered_by, entered_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (match_id) DO UPDATE SET winner = EXCLUDED.winner, entered_by = EXCLUDED.entered_by, entered_at = NOW()`,
        [matchId, winner, session.user.id]
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'knockout_payment') {
    const { userId, paid } = body;
    if (!userId) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    await query('UPDATE users SET paid_knockout = $1 WHERE id = $2', [!!paid, userId]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
}
