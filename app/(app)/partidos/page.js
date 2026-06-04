import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { matches } from '@/lib/data';
import MatchesList from '@/components/MatchesList';

export const dynamic = 'force-dynamic';

export default async function PartidosPage() {
  const session = await getServerSession(authOptions);

  const [picksRes, resultsRes] = await Promise.all([
    query('SELECT match_id, pick FROM picks WHERE user_id = $1', [session.user.id]),
    query('SELECT match_id, result FROM match_results'),
  ]);

  const initialPicks = {};
  picksRes.rows.forEach(r => { initialPicks[r.match_id] = r.pick; });

  const results = {};
  resultsRes.rows.forEach(r => { results[r.match_id] = r.result; });

  return (
    <>
      <div className="section-header">
        <h2>Fase de Grupos</h2>
        <span className="badge blue">72 Partidos</span>
      </div>
      <MatchesList matches={matches} initialPicks={initialPicks} results={results} />
    </>
  );
}
