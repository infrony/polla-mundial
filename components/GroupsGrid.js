'use client';
import { useState, useRef } from 'react';
import { groups } from '@/lib/data';

function isLocked(lockDate) {
  return new Date() >= new Date(lockDate);
}

export default function GroupsGrid({ initialPicks, results }) {
  const [picks, setPicks] = useState(initialPicks || {});
  const [saving, setSaving] = useState({}); // { groupKey: 'saving' | 'saved' | 'error' }
  const timers = useRef({});

  async function handleChange(groupKey, pos, team) {
    // Update local state immediately
    setPicks(p => ({
      ...p,
      [groupKey]: { ...(p[groupKey] || {}), [pos]: team },
    }));

    // Show saving indicator
    setSaving(s => ({ ...s, [groupKey]: 'saving' }));
    clearTimeout(timers.current[groupKey]);

    try {
      const res = await fetch('/api/group-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupKey, pos, team }),
      });
      if (!res.ok) throw new Error();
      setSaving(s => ({ ...s, [groupKey]: 'saved' }));
    } catch {
      setSaving(s => ({ ...s, [groupKey]: 'error' }));
    }

    // Clear indicator after 2s
    timers.current[groupKey] = setTimeout(() => {
      setSaving(s => ({ ...s, [groupKey]: null }));
    }, 2000);
  }

  return (
    <div className="groups-grid">
      {Object.entries(groups).map(([key, g]) => {
        const p = picks[key] || {};
        const r = results?.[key] || {};
        const locked = isLocked(g.lockDate);
        const status = saving[key];

        return (
          <div key={key} className="group-card" style={{ opacity: locked ? 0.75 : 1 }}>
            <div
              className="group-header"
              style={{ background: `${g.color}22`, borderBottom: `2px solid ${g.color}`, color: g.color }}
            >
              GRUPO {key}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {locked && (
                  <span style={{ fontSize: '0.6rem', fontFamily: "'Barlow Condensed'", letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                    🔒 Cerrado
                  </span>
                )}
                {!locked && status === 'saving' && (
                  <span style={{ fontSize: '0.6rem', fontFamily: "'Barlow Condensed'", color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>guardando…</span>
                )}
                {!locked && status === 'saved' && (
                  <span style={{ fontSize: '0.6rem', fontFamily: "'Barlow Condensed'", color: 'var(--success)', letterSpacing: '1px' }}>✓ guardado</span>
                )}
                {!locked && status === 'error' && (
                  <span style={{ fontSize: '0.6rem', fontFamily: "'Barlow Condensed'", color: 'var(--red)', letterSpacing: '1px' }}>✗ error</span>
                )}
                <small style={{ opacity: 0.6 }}>{g.teams.length} equipos</small>
              </div>
            </div>

            <div className="group-teams-list">
              {g.teams.map((t, i) => (
                <div key={t} className="group-team-row">
                  <span style={{ fontSize: '1rem' }}>{g.flag[i]}</span>
                  {t}
                  {r.first === t && (
                    <span style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: '0.7rem', fontFamily: "'Bebas Neue'" }}>1°</span>
                  )}
                  {r.second === t && (
                    <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: "'Bebas Neue'" }}>2°</span>
                  )}
                </div>
              ))}
            </div>

            <div className="qualified-inputs">
              <div className="qualified-label">Clasificados</div>

              <div className="pos-row">
                <span className="pos-label">1°</span>
                <select
                  className="qualified-select"
                  value={p.first || ''}
                  onChange={e => handleChange(key, 'first', e.target.value)}
                  disabled={locked}
                  style={locked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  <option value="">— Seleccionar —</option>
                  {g.teams.map((t, i) => (
                    <option key={t} value={t}>{g.flag[i]} {t}</option>
                  ))}
                </select>
              </div>

              <div className="pos-row">
                <span className="pos-label" style={{ color: 'rgba(255,255,255,0.5)' }}>2°</span>
                <select
                  className="qualified-select"
                  value={p.second || ''}
                  onChange={e => handleChange(key, 'second', e.target.value)}
                  disabled={locked}
                  style={locked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  <option value="">— Seleccionar —</option>
                  {g.teams.map((t, i) => (
                    <option key={t} value={t}>{g.flag[i]} {t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
