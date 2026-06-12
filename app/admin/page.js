import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!session.user.isAdmin) redirect('/partidos');

  const [usersRes, picksRes, gPicksRes, resultsRes, gResultsRes, koMatchesRes, koResultsRes] = await Promise.all([
    query(`SELECT id, name, email, image, provider, is_admin, paid, paid_knockout, picks_unlocked, group_picks_unlocked, created_at,
            (SELECT COUNT(*) FROM picks WHERE user_id = users.id) AS pick_count
           FROM users ORDER BY created_at`),
    query('SELECT user_id, match_id, pick FROM picks ORDER BY user_id, match_id'),
    query('SELECT user_id, group_key, first_team, second_team FROM group_picks ORDER BY user_id, group_key'),
    query('SELECT match_id, result FROM match_results ORDER BY match_id'),
    query('SELECT group_key, first_team, second_team FROM group_results ORDER BY group_key'),
    query(`SELECT id, round, match_number, team1, team2, match_date, locked FROM knockout_matches ORDER BY
           CASE round WHEN 'r32' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 3 WHEN 'sf' THEN 4 WHEN '3rd' THEN 5 WHEN 'final' THEN 6 END,
           match_number`),
    query('SELECT match_id, winner FROM knockout_results'),
  ]);

  return (
    <AdminPanel
      users={usersRes.rows}
      picks={picksRes.rows}
      groupPicks={gPicksRes.rows}
      results={resultsRes.rows}
      groupResults={gResultsRes.rows}
      knockoutMatches={koMatchesRes.rows}
      knockoutResults={koResultsRes.rows}
    />
  );
}
