import { query } from '@/lib/db';
import { matches } from '@/lib/data';
import MatchesList from '@/components/MatchesList';
import { getSession } from '@/lib/session';
import { getMatchResults, getCachedGameTimes } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export default async function PartidosPage() {
  const session = await getSession();

  const [picksRes, resultsRows, userRes, gameTimesRaw] = await Promise.all([
    query('SELECT match_id, pick FROM picks WHERE user_id = $1', [session.user.id]),
    getMatchResults(),
    query('SELECT picks_unlocked FROM users WHERE id = $1', [session.user.id]),
    getCachedGameTimes(),
  ]);

  // Reshape to match previous structure
  const resultsRes = { rows: resultsRows };

  const initialPicks = {};
  picksRes.rows.forEach(r => { initialPicks[r.match_id] = r.pick; });

  const results = {};
  resultsRes.rows.forEach(r => {
    results[r.match_id] = {
      result: r.result,
      score_t1: r.score_t1 ?? null,
      score_t2: r.score_t2 ?? null,
      status: r.match_status ?? null,
    };
  });

  const picksUnlocked = userRes.rows[0]?.picks_unlocked === true;

  // Build matchId → "HH:MM" using team name pairs
  const matchTimes = {};
  for (const m of matches) {
    const time = gameTimesRaw[`${m.t1}|${m.t2}`] || '';
    if (time) matchTimes[m.id] = time;
  }

  return (
    <>
      <div className="section-header">
        <h2>Fase de Grupos</h2>
        <span className="badge blue">72 Partidos</span>
      </div>
      <MatchesList matches={matches} initialPicks={initialPicks} results={results} picksUnlocked={picksUnlocked} matchTimes={matchTimes} />
    </>
  );
}
