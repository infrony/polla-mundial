import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const res = await query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.image,
      COUNT(DISTINCT p.match_id) AS total_picks,
      COUNT(DISTINCT CASE WHEN p.pick = mr.result THEN p.match_id END) AS correct_matches,
      COALESCE(SUM(CASE WHEN p.pick = mr.result THEN 1 ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN gp.first_team = gr.first_team AND gp.first_team IS NOT NULL THEN 2 ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN gp.second_team = gr.second_team AND gp.second_team IS NOT NULL THEN 1 ELSE 0 END), 0)
      AS total_pts
    FROM users u
    LEFT JOIN picks p ON p.user_id = u.id
    LEFT JOIN match_results mr ON mr.match_id = p.match_id
    LEFT JOIN group_picks gp ON gp.user_id = u.id
    LEFT JOIN group_results gr ON gr.group_key = gp.group_key
    GROUP BY u.id, u.name, u.email, u.image
    ORDER BY total_pts DESC, total_picks DESC
  `);

  return NextResponse.json(res.rows);
}
