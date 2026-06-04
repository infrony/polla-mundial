import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { matches, groups } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function MisPicksPage() {
  const session = await getServerSession(authOptions);

  const [picksRes, gPicksRes, resultsRes, gResultsRes] = await Promise.all([
    query('SELECT match_id, pick FROM picks WHERE user_id = $1', [session.user.id]),
    query('SELECT group_key, first_team, second_team FROM group_picks WHERE user_id = $1', [session.user.id]),
    query('SELECT match_id, result FROM match_results'),
    query('SELECT group_key, first_team, second_team FROM group_results'),
  ]);

  const picks = {};
  picksRes.rows.forEach(r => { picks[r.match_id] = r.pick; });

  const gPicks = {};
  gPicksRes.rows.forEach(r => { gPicks[r.group_key] = { first: r.first_team, second: r.second_team }; });

  const results = {};
  resultsRes.rows.forEach(r => { results[r.match_id] = r.result; });

  const gResults = {};
  gResultsRes.rows.forEach(r => { gResults[r.group_key] = { first: r.first_team, second: r.second_team }; });

  const totalPicks = Object.keys(picks).length;
  const pct = Math.round(totalPicks / matches.length * 100);

  let correctMatches = 0;
  Object.entries(picks).forEach(([matchId, pick]) => {
    if (results[matchId] && results[matchId] === pick) correctMatches++;
  });

  let groupPts = 0;
  Object.entries(gPicks).forEach(([gKey, p]) => {
    const r = gResults[gKey];
    if (!r) return;
    if (p.first && p.first === r.first) groupPts += 2;
    if (p.second && p.second === r.second) groupPts += 1;
  });

  const byGroup = {};
  matches.forEach(m => {
    if (!byGroup[m.group]) byGroup[m.group] = { total: 0, picked: 0 };
    byGroup[m.group].total++;
    if (picks[m.id]) byGroup[m.group].picked++;
  });

  const pickLabels = { '1': 'Local', 'x': 'Empate', '2': 'Visitante' };

  return (
    <>
      <div className="section-header">
        <h2>Mis Predicciones</h2>
        <span className="badge gold">Resumen</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalPicks}</div>
          <div className="stat-label">Total Picks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pct}%</div>
          <div className="stat-label">Completado</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{correctMatches}</div>
          <div className="stat-label">Aciertos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{correctMatches + groupPts}</div>
          <div className="stat-label">Puntos</div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-header">
          <span>Progreso de Pronósticos</span>
          <span>{totalPicks} / {matches.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="section-header" style={{ marginTop: '16px' }}>
        <h2>Picks por Grupo</h2>
      </div>

      {Object.entries(byGroup).map(([g, v]) => {
        const gColor = groups[g]?.color || '#333';
        const gpct = v.total > 0 ? Math.round(v.picked / v.total * 100) : 0;
        return (
          <div key={g} className="group-pick-row" style={{ borderLeft: `3px solid ${gColor}` }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', letterSpacing: '2px', color: gColor, minWidth: '70px' }}>
              GRUPO {g}
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: gColor, width: `${gpct}%`, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', minWidth: '40px', textAlign: 'right' }}>
              {v.picked}/{v.total}
            </div>
          </div>
        );
      })}

      {totalPicks > 0 && (
        <>
          <div className="section-header" style={{ marginTop: '20px' }}>
            <h2>Últimos Picks</h2>
          </div>
          {matches.filter(m => picks[m.id]).slice(-10).reverse().map(m => {
            const pick = picks[m.id];
            const result = results[m.id];
            const isCorrect = result && result === pick;
            return (
              <div key={m.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', color: groups[m.group]?.color, letterSpacing: '1px' }}>GRUPO {m.group}</span>
                <span style={{ flex: 1, fontFamily: "'Barlow Condensed'", fontSize: '0.85rem' }}>{m.f1} {m.t1} vs {m.t2} {m.f2}</span>
                <span className={`pick-badge ${pick === '1' ? 'p1' : pick === 'x' ? 'px' : 'p2'}${isCorrect ? '' : ''}`} style={{ background: isCorrect ? 'var(--success)' : undefined, color: isCorrect ? 'var(--dark)' : undefined }}>
                  {pick === '1' ? m.t1.split(' ')[0] : pick === 'x' ? 'EMPATE' : m.t2.split(' ')[0]}
                  {isCorrect ? ' ✓' : ''}
                </span>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
