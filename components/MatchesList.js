'use client';
import { useState, useCallback, useRef } from 'react';
import { groups, TOURNAMENT_START } from '@/lib/data';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P']);

function parseResult(r) {
  // r can be an object {result, score_t1, score_t2, status} or legacy string
  if (!r) return null;
  if (typeof r === 'string') return { result: r, score_t1: null, score_t2: null, status: null };
  return r;
}

function StatusBadge({ status, score_t1, score_t2 }) {
  if (!status) return null;
  const base = status.split(':')[0];
  const elapsed = status.split(':')[1];
  const isLive = LIVE_STATUSES.has(base);
  if (!isLive) return null;

  const label = base === 'HT' ? 'DESCANSO' : base === 'ET' ? 'PRÓRR.' : base === 'P' ? 'PENALES' : elapsed ? `${elapsed}'` : 'EN VIVO';
  return (
    <span className="live-badge">● {label}</span>
  );
}

export default function MatchesList({ matches, initialPicks, results, picksUnlocked }) {
  const [picks, setPicks] = useState(initialPicks || {});
  const [toast, setToast] = useState('');
  const [activeGroup, setActiveGroup] = useState('ALL');
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  const handlePick = useCallback(async (matchId, pick) => {
    const prev = picks[matchId];
    setPicks(p => ({ ...p, [matchId]: pick }));
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, pick }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPicks(p => ({ ...p, [matchId]: prev }));
      showToast('Error al guardar. Intenta de nuevo.');
    }
  }, [picks]);

  const groupKeys = ['ALL', ...Object.keys(groups)];
  const filtered = activeGroup === 'ALL' ? matches : matches.filter(m => m.group === activeGroup);

  return (
    <>
      <div className="filter-bar">
        {groupKeys.map(g => (
          <button
            key={g}
            className={`filter-btn${activeGroup === g ? ' active' : ''}`}
            onClick={() => setActiveGroup(g)}
            style={g !== 'ALL' ? { borderColor: activeGroup === g ? groups[g].color : undefined, color: activeGroup === g ? groups[g].color : undefined } : {}}
          >
            {g === 'ALL' ? 'Todos' : `Grupo ${g}`}
          </button>
        ))}
      </div>

      <div id="matches-list">
        {filtered.map(m => {
          const gColor = groups[m.group]?.color || '#003DA5';
          const pick = picks[m.id] || '';
          const r = parseResult(results?.[m.id]);
          const statusBase = r?.status?.split(':')[0];
          const isLive = r?.status && LIVE_STATUSES.has(statusBase);
          const hasScore = r?.score_t1 !== null && r?.score_t1 !== undefined && r?.score_t2 !== null;
          const isDateLocked = !picksUnlocked && Date.now() >= new Date(TOURNAMENT_START).getTime();
          const isLocked = isLive || !!r?.result || isDateLocked;

          const t1Wins = r?.result === '1';
          const t2Wins = r?.result === '2';
          const isDraw = r?.result === 'x';

          return (
            <div key={m.id} className={`match-card${isLive ? ' match-live' : ''}`} style={{ '--group-color': gColor }}>
              <div className="match-meta">
                <span className="match-date">📅 {m.date}</span>
                <span className="group-tag" style={{ color: gColor }}>GRUPO {m.group}</span>
              </div>
              <div className="match-teams">
                <div className={`team${t2Wins ? ' team-dim' : t1Wins ? ' team-winner' : ''}`}>
                  <img className="team-flag-img" src={`https://flagcdn.com/w80/${m.iso1}.png`} alt={m.t1} />
                  <div className="team-name">
                    {t1Wins && <span className="winner-crown">🏆</span>}
                    {m.t1}
                  </div>
                </div>

                <div className="vs-block">
                  {isLive && hasScore ? (
                    <>
                      <span className="score-display score-live">{r.score_t1} – {r.score_t2}</span>
                      <StatusBadge status={r.status} />
                    </>
                  ) : hasScore && r?.result ? (
                    <>
                      <span className="score-display score-final">{r.score_t1} – {r.score_t2}</span>
                      <span className="result-label">
                        {t1Wins ? m.t1.split(' ')[0] : t2Wins ? m.t2.split(' ')[0] : 'EMPATE'}
                      </span>
                    </>
                  ) : r?.result ? (
                    <span className="result-label">
                      {t1Wins ? m.t1.split(' ')[0] : t2Wins ? m.t2.split(' ')[0] : 'EMPATE'}
                    </span>
                  ) : (
                    <span className="vs-text">VS</span>
                  )}
                </div>

                <div className={`team right${t1Wins ? ' team-dim' : t2Wins ? ' team-winner' : ''}`}>
                  <img className="team-flag-img" src={`https://flagcdn.com/w80/${m.iso2}.png`} alt={m.t2} />
                  <div className="team-name">
                    {t2Wins && <span className="winner-crown">🏆</span>}
                    {m.t2}
                  </div>
                </div>
              </div>

              <div className="result-selector">
                {['1','x','2'].map(val => {
                  const label = val === '1' ? m.t1.split(' ')[0] : val === 'x' ? 'EMPATE' : m.t2.split(' ')[0];
                  const isSelected = pick === val;
                  const isCorrect = r?.result && r.result === val;
                  let cls = 'result-btn';
                  if (isCorrect) cls += ' correct';
                  else if (isSelected) cls += ` selected-${val}`;
                  return (
                    <button
                      key={val}
                      className={cls}
                      onClick={() => !isLocked && handlePick(m.id, val)}
                      disabled={isLocked}
                      title={label}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}
