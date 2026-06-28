import { query } from '@/lib/db';
import { matches, groups } from '@/lib/data';
import { getSession } from '@/lib/session';
import { getMatchResults, getGroupResults } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const KO_ROUNDS = [
  { key: 'r32',   label: 'Dieciseisavos de Final', pts: 1 },
  { key: 'r16',   label: 'Octavos de Final',        pts: 2 },
  { key: 'qf',    label: 'Cuartos de Final',         pts: 4 },
  { key: 'sf',    label: 'Semifinal',                pts: 6 },
  { key: '3rd',   label: 'Tercer Lugar',             pts: 8 },
  { key: 'final', label: 'Gran Final',               pts: 8 },
];
const KO_PTS = { r32: 1, r16: 2, qf: 4, sf: 6, '3rd': 8, final: 8 };

export default async function MisPicksPage() {
  const session = await getSession();

  const [picksRes, gPicksRes, resultsRows, gResultsRows, koPicksRes, koMatchesRes, koResultsRes, userRes] = await Promise.all([
    query('SELECT match_id, pick FROM picks WHERE user_id = $1', [session.user.id]),
    query('SELECT group_key, first_team, second_team FROM group_picks WHERE user_id = $1', [session.user.id]),
    getMatchResults(),
    getGroupResults(),
    query('SELECT match_id, pick FROM knockout_picks WHERE user_id = $1', [session.user.id]),
    query(`SELECT id, round, match_number, team1, team2, match_date FROM knockout_matches
           ORDER BY CASE round WHEN 'r32' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 3
                               WHEN 'sf' THEN 4 WHEN '3rd' THEN 5 WHEN 'final' THEN 6 END,
                    match_number`),
    query('SELECT match_id, winner, result_90 FROM knockout_results').catch(() => ({ rows: [] })),
    query('SELECT paid_knockout FROM users WHERE id = $1', [session.user.id]),
  ]);

  // ── Group stage ──
  const picks = {};
  picksRes.rows.forEach(r => { picks[r.match_id] = r.pick; });

  const gPicks = {};
  gPicksRes.rows.forEach(r => { gPicks[r.group_key] = { first: r.first_team, second: r.second_team }; });

  const results = {};
  resultsRows.forEach(r => { results[r.match_id] = r.result; });

  const gResults = {};
  gResultsRows.forEach(r => { gResults[r.group_key] = { first: r.first_team, second: r.second_team }; });

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

  // ── Knockout stage ──
  const koPicks = {};
  koPicksRes.rows.forEach(r => { koPicks[r.match_id] = r.pick; });

  const koResults = {};
  koResultsRes.rows.forEach(r => { koResults[r.match_id] = { winner: r.winner, result90: r.result_90 }; });

  const paidKnockout = userRes.rows[0]?.paid_knockout ?? false;

  const koMatchesByRound = {};
  koMatchesRes.rows.forEach(m => {
    if (!koMatchesByRound[m.round]) koMatchesByRound[m.round] = [];
    koMatchesByRound[m.round].push(m);
  });

  let koPoints = 0;
  Object.entries(koPicks).forEach(([matchId, pick]) => {
    const r = koResults[Number(matchId)];
    if (r?.result90 && r.result90 === pick) {
      const m = koMatchesRes.rows.find(x => x.id === Number(matchId));
      if (m) koPoints += KO_PTS[m.round] || 0;
    }
  });

  const totalKOPicks = Object.keys(koPicks).length;
  const totalKOAvailable = koMatchesRes.rows.filter(m => m.team1 && m.team2).length;

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

      {/* ── Fase Eliminatoria ── */}
      {paidKnockout && (
        <>
          <div className="section-header" style={{ marginTop: '24px' }}>
            <h2>Fase Eliminatoria</h2>
            {koPoints > 0 && (
              <span className="badge gold">+{koPoints} pts</span>
            )}
            <span style={{
              marginLeft: 'auto',
              fontFamily: "'Barlow Condensed'", fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)', letterSpacing: '1px',
            }}>
              {totalKOPicks} picks realizados
            </span>
          </div>

          {KO_ROUNDS.map(({ key, label, pts }) => {
            const roundMatches = (koMatchesByRound[key] || []).filter(m => koPicks[m.id]);
            if (roundMatches.length === 0) return null;
            return (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: "'Bebas Neue'", fontSize: '0.9rem', letterSpacing: '2px',
                  color: '#F5A623', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: '1px solid rgba(245,166,35,0.15)', paddingBottom: 4,
                }}>
                  {label}
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow Condensed'", letterSpacing: '1px' }}>
                    +{pts} pts por acierto
                  </span>
                </div>

                {roundMatches.map(m => {
                  const pick = koPicks[m.id];
                  const result = koResults[m.id];
                  const hasResult = !!result?.result90;
                  const isCorrect = hasResult && result.result90 === pick;
                  const isWrong = hasResult && result.result90 !== pick;

                  const team1 = m.team1 || 'Equipo 1';
                  const team2 = m.team2 || 'Equipo 2';
                  const pickedTeam = pick === '1' ? team1 : pick === '2' ? team2 : 'Empate';
                  const resultTeam = result?.result90 === '1' ? team1 : result?.result90 === '2' ? team2 : result?.result90 === 'x' ? 'Empate' : null;

                  return (
                    <div key={m.id} style={{
                      background: 'var(--card-bg)',
                      border: `1px solid ${isCorrect ? 'rgba(46,204,113,0.3)' : isWrong ? 'rgba(231,76,60,0.25)' : 'var(--border)'}`,
                      borderRadius: '8px', padding: '10px 14px', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                    }}>
                      <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', minWidth: 60 }}>
                        #{m.match_number}{m.match_date ? ` · ${m.match_date}` : ''}
                      </span>
                      <span style={{ flex: 1, fontFamily: "'Barlow Condensed'", fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                        {team1} vs {team2}
                      </span>
                      <span style={{
                        fontFamily: "'Barlow Condensed'", fontSize: '0.8rem', fontWeight: 700,
                        letterSpacing: '1px', padding: '3px 10px', borderRadius: 4,
                        background: isCorrect ? 'rgba(46,204,113,0.15)' : isWrong ? 'rgba(231,76,60,0.12)' : 'rgba(245,166,35,0.12)',
                        color: isCorrect ? '#2ecc71' : isWrong ? '#e74c3c' : '#F5A623',
                        border: `1px solid ${isCorrect ? 'rgba(46,204,113,0.3)' : isWrong ? 'rgba(231,76,60,0.25)' : 'rgba(245,166,35,0.3)'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {pickedTeam.split(' ')[0]}{isCorrect ? ' ✓' : isWrong ? ' ✗' : ''}
                      </span>
                      {hasResult && resultTeam && (
                        <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                          → {resultTeam.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {totalKOPicks === 0 && (
            <div style={{
              textAlign: 'center', padding: '20px',
              fontFamily: "'Barlow Condensed'", fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.35)',
            }}>
              Aún no has realizado picks en la fase eliminatoria.
            </div>
          )}
        </>
      )}

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
