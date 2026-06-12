import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import GroupsGrid from '@/components/GroupsGrid';
import { fetchAllGroupStandings } from '@/lib/football-api';

export const dynamic = 'force-dynamic';

export default async function GruposPage() {
  const session = await getServerSession(authOptions);

  const [gPicksRes, gResultsRes, standings, userRes] = await Promise.all([
    query('SELECT group_key, first_team, second_team FROM group_picks WHERE user_id = $1', [session.user.id]),
    query('SELECT group_key, first_team, second_team FROM group_results'),
    fetchAllGroupStandings().catch(() => ({})),
    query('SELECT group_picks_unlocked FROM users WHERE id = $1', [session.user.id]),
  ]);

  const initialPicks = {};
  gPicksRes.rows.forEach(r => { initialPicks[r.group_key] = { first: r.first_team, second: r.second_team }; });

  const results = {};
  gResultsRes.rows.forEach(r => { results[r.group_key] = { first: r.first_team, second: r.second_team }; });

  return (
    <>
      <div className="section-header">
        <h2>Pronóstico de Grupos</h2>
        <span className="badge gold">+1 Pt por acierto</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '14px', lineHeight: 1.4 }}>
        Selecciona quién clasifica 1° y 2° en cada grupo para ganar puntos extra.
      </p>
      <GroupsGrid
        initialPicks={initialPicks}
        results={results}
        standings={standings}
        groupPicksUnlocked={userRes.rows[0]?.group_picks_unlocked === true}
      />
    </>
  );
}
