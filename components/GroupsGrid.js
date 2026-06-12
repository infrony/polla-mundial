'use client';
import { useState, useRef } from 'react';
import { groups, TOURNAMENT_START } from '@/lib/data';

function isLocked() {
  return new Date() >= new Date(TOURNAMENT_START);
}

function StandingsTable({ groupKey, rows, groupResults = {} }) {
  if (!rows || rows.length === 0) return null;
  const g = groups[groupKey];
  const hasData = rows.some(r => r.w > 0 || r.d > 0 || r.l > 0);

  return (
    <div style={{ margin: '10px 0 6px' }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.58rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.28)', marginBottom: '5px' }}>
        TABLA DEL GRUPO
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', fontFamily: "'Barlow Condensed'" }}>
        <thead>
          <tr style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <th style={{ textAlign: 'left',   padding: '2px 3px', fontWeight: 500 }}>#</th>
            <th style={{ textAlign: 'left',   padding: '2px 3px', fontWeight: 500 }}>Equipo</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500 }}>J</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500 }}>G</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500 }}>E</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500 }}>P</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500 }}>GF</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500 }}>GC</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500 }}>DG</th>
            <th style={{ textAlign: 'center', padding: '2px 3px', fontWeight: 500, color: g?.color }}>PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, pos) => {
            const isoIdx = g?.iso.indexOf(row.iso) ?? -1;
            const nameEs = isoIdx >= 0 ? g.teams[isoIdx] : row.iso?.toUpperCase() || '—';
            const flag   = isoIdx >= 0 ? g.flag[isoIdx] : null;
            const top2   = pos < 2 && hasData;
            return (
              <tr key={row.teamId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: top2 ? `${g?.color}12` : 'transparent' }}>
                <td style={{ padding: '4px 3px', color: top2 ? g?.color : 'rgba(255,255,255,0.3)', fontWeight: top2 ? 700 : 400 }}>{pos + 1}</td>
                <td style={{ padding: '4px 3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    {flag && <span style={{ fontSize: '0.8rem' }}>{flag}</span>}
                    <span style={{ color: top2 ? '#fff' : 'rgba(255,255,255,0.6)' }}>{nameEs}</span>
                    {groupResults.first === nameEs && (
                      <span style={{ marginLeft: '3px', fontSize: '0.6rem', color: 'var(--gold)', fontFamily: "'Bebas Neue'" }}>1°</span>
                    )}
                    {groupResults.second === nameEs && (
                      <span style={{ marginLeft: '3px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'Bebas Neue'" }}>2°</span>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '4px 3px', color: 'rgba(255,255,255,0.45)' }}>{row.mp}</td>
                <td style={{ textAlign: 'center', padding: '4px 3px', color: row.w > 0 ? '#2ecc71' : 'rgba(255,255,255,0.35)' }}>{row.w}</td>
                <td style={{ textAlign: 'center', padding: '4px 3px', color: 'rgba(255,255,255,0.35)' }}>{row.d}</td>
                <td style={{ textAlign: 'center', padding: '4px 3px', color: row.l > 0 ? '#e74c3c' : 'rgba(255,255,255,0.35)' }}>{row.l}</td>
                <td style={{ textAlign: 'center', padding: '4px 3px', color: 'rgba(255,255,255,0.45)' }}>{row.gf}</td>
                <td style={{ textAlign: 'center', padding: '4px 3px', color: 'rgba(255,255,255,0.45)' }}>{row.ga}</td>
                <td style={{ textAlign: 'center', padding: '4px 3px', color: row.gd > 0 ? '#2ecc71' : row.gd < 0 ? '#e74c3c' : 'rgba(255,255,255,0.35)' }}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td style={{ textAlign: 'center', padding: '4px 3px', fontWeight: 700, color: top2 ? g?.color : '#fff' }}>{row.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function GroupsGrid({ initialPicks, results, standings = {} }) {
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
        const locked = isLocked();
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

            <StandingsTable groupKey={key} rows={standings[key] || []} groupResults={r} />

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
