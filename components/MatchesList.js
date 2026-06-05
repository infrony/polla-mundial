'use client';
import { useState, useCallback, useRef } from 'react';
import { groups } from '@/lib/data';

export default function MatchesList({ matches, initialPicks, results }) {
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
          const result = results?.[m.id];
          const isLocked = !!result;

          return (
            <div key={m.id} className="match-card" style={{ '--group-color': gColor }}>
              <div className="match-meta">
                <span className="match-date">📅 {m.date}</span>
                <span className="group-tag" style={{ color: gColor }}>GRUPO {m.group}</span>
              </div>
              <div className="match-teams">
                <div className="team">
                  <img className="team-flag-img" src={`https://flagcdn.com/w80/${m.iso1}.png`} alt={m.t1} />
                  <div className="team-name">{m.t1}</div>
                </div>
                <div className="vs-block">
                  <span className="vs-text">VS</span>
                  {result && <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontFamily: "'Bebas Neue',sans-serif", letterSpacing: '1px' }}>{result === '1' ? m.t1.split(' ')[0] : result === '2' ? m.t2.split(' ')[0] : 'EMPATE'}</span>}
                </div>
                <div className="team right">
                  <img className="team-flag-img" src={`https://flagcdn.com/w80/${m.iso2}.png`} alt={m.t2} />
                  <div className="team-name">{m.t2}</div>
                </div>
              </div>
              <div className="result-selector">
                {['1','x','2'].map(val => {
                  const label = val === '1' ? m.t1.split(' ')[0] : val === 'x' ? 'EMPATE' : m.t2.split(' ')[0];
                  const isSelected = pick === val;
                  const isCorrect = result && result === val;
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
