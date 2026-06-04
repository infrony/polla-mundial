'use client';
import { useState, useRef } from 'react';
import { matches, groups } from '@/lib/data';
import Link from 'next/link';

export default function AdminPanel({ users, picks: initialPicks, groupPicks: initialGPicks, results: initialResults, groupResults: initialGResults }) {
  const [results, setResults] = useState(() => {
    const r = {};
    initialResults.forEach(x => { r[x.match_id] = x.result; });
    return r;
  });
  const [gResults, setGResults] = useState(() => {
    const r = {};
    initialGResults.forEach(x => { r[x.group_key] = { first: x.first_team, second: x.second_team }; });
    return r;
  });
  const [usersPaid, setUsersPaid] = useState(() => {
    const m = {};
    users.forEach(u => { m[u.id] = u.paid; });
    return m;
  });
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const toastRef = useRef(null);

  const picksMap = {};
  initialPicks.forEach(p => {
    if (!picksMap[p.user_id]) picksMap[p.user_id] = {};
    picksMap[p.user_id][p.match_id] = p.pick;
  });

  const gPicksMap = {};
  initialGPicks.forEach(p => {
    if (!gPicksMap[p.user_id]) gPicksMap[p.user_id] = {};
    gPicksMap[p.user_id][p.group_key] = { first: p.first_team, second: p.second_team };
  });

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2500);
  }

  async function togglePaid(userId) {
    const newVal = !usersPaid[userId];
    setUsersPaid(p => ({ ...p, [userId]: newVal }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment', userId, paid: newVal }),
    });
    if (res.ok) showToast(newVal ? '✅ Inscripción confirmada ($5)' : '⚠️ Inscripción revocada');
    else { setUsersPaid(p => ({ ...p, [userId]: !newVal })); showToast('❌ Error al guardar'); }
  }

  async function saveResult(matchId, result) {
    setResults(r => ({ ...r, [matchId]: result }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'match', matchId, result }),
    });
    if (res.ok) showToast('✅ Resultado guardado');
    else showToast('❌ Error al guardar');
  }

  async function saveGroupResult(groupKey, pos, team) {
    const cur = gResults[groupKey] || {};
    const updated = { ...cur, [pos]: team };
    setGResults(r => ({ ...r, [groupKey]: updated }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'group', groupKey, firstTeam: updated.first, secondTeam: updated.second }),
    });
    if (res.ok) showToast('✅ Resultado de grupo guardado');
    else showToast('❌ Error al guardar');
  }

  function calcPts(userId) {
    const up = picksMap[userId] || {};
    let pts = 0;
    Object.entries(up).forEach(([mid, pick]) => { if (results[mid] && results[mid] === pick) pts++; });
    const ugp = gPicksMap[userId] || {};
    Object.entries(ugp).forEach(([gKey, p]) => {
      const r = gResults[gKey] || {};
      if (p.first && p.first === r.first) pts += 2;
      if (p.second && p.second === r.second) pts += 1;
    });
    return pts;
  }

  const userPicks = selectedUser ? (picksMap[selectedUser.id] || {}) : {};

  return (
    <>
      <div className="world-strip" />
      <header>
        <div className="header-inner" style={{ maxWidth: '1100px' }}>
          <div className="logo-block">
            <svg className="trophy-svg" viewBox="0 0 100 100" fill="none">
              <path d="M50 10 L60 35 H85 L65 55 L72 80 L50 65 L28 80 L35 55 L15 35 H40 Z" fill="#F5A623" opacity="0.9"/>
            </svg>
            <div>
              <div className="header-title">Admin Panel</div>
              <div className="header-subtitle">Polla Mundial 2026</div>
            </div>
          </div>
          <Link href="/partidos" className="btn-sm">← Volver al juego</Link>
        </div>
      </header>

      <div className="admin-wrapper">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['users','matches','groups'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className="filter-btn" style={activeTab === t ? { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'rgba(255,255,255,0.06)' } : {}}>
              {t === 'users' ? '👥 Participantes' : t === 'matches' ? '⚽ Resultados Partidos' : '🏆 Resultados Grupos'}
            </button>
          ))}
        </div>

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <>
            <div className="section-header">
              <h2>Participantes</h2>
              <span className="badge">{users.length} usuarios</span>
              <span className="badge gold" style={{ marginLeft: 'auto' }}>
                💰 {Object.values(usersPaid).filter(Boolean).length} / {users.length} pagaron
              </span>
            </div>
            <div className="admin-grid">
              {users.map(u => {
                const initials = u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={u.id} className="user-card" onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}>
                    <div className="user-card-header">
                      <div className="user-avatar">
                        {u.image ? <img src={u.image} alt={u.name} /> : <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.9rem' }}>{initials}</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="user-name">{u.name}{u.is_admin && ' 🛡️'}</div>
                        <div className="user-email">{u.email}</div>
                      </div>
                      {/* Badge de inscripción */}
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontFamily: "'Barlow Condensed'",
                        letterSpacing: '1px',
                        fontWeight: 600,
                        background: usersPaid[u.id] ? 'rgba(46,204,113,0.15)' : 'rgba(200,16,46,0.15)',
                        border: `1px solid ${usersPaid[u.id] ? '#2ecc71' : '#C8102E'}`,
                        color: usersPaid[u.id] ? '#2ecc71' : '#ff6b7a',
                        whiteSpace: 'nowrap',
                      }}>
                        {usersPaid[u.id] ? '✓ Pagó $5' : '✗ Sin pago'}
                      </div>
                    </div>
                    <div className="user-stats">
                      <div className="user-stat"><div className="user-stat-val">{u.pick_count}</div><div className="user-stat-lbl">Picks</div></div>
                      <div className="user-stat"><div className="user-stat-val">{calcPts(u.id)}</div><div className="user-stat-lbl">Puntos</div></div>
                      <div className="user-stat"><div className="user-stat-val" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>{u.provider === 'google' ? 'G' : '📧'}</div><div className="user-stat-lbl">Acceso</div></div>
                    </div>
                    {/* Botón toggle de pago */}
                    <button
                      onClick={e => { e.stopPropagation(); togglePaid(u.id); }}
                      style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '7px',
                        border: `1px solid ${usersPaid[u.id] ? 'rgba(200,16,46,0.4)' : 'rgba(46,204,113,0.4)'}`,
                        borderRadius: '6px',
                        background: usersPaid[u.id] ? 'rgba(200,16,46,0.1)' : 'rgba(46,204,113,0.1)',
                        color: usersPaid[u.id] ? '#ff6b7a' : '#2ecc71',
                        fontFamily: "'Barlow Condensed'",
                        fontSize: '0.78rem',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {usersPaid[u.id] ? '✗ Revocar inscripción' : '✓ Confirmar pago $5'}
                    </button>
                    {selectedUser?.id === u.id && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>PICKS DEL USUARIO</div>
                        {matches.slice(0, 15).map(m => {
                          const pick = userPicks[m.id];
                          if (!pick) return null;
                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.75rem' }}>
                              <span style={{ color: groups[m.group]?.color, fontFamily: "'Bebas Neue'", fontSize: '0.7rem' }}>{m.group}</span>
                              <span style={{ flex: 1 }}>{m.f1} {m.t1} vs {m.t2} {m.f2}</span>
                              <span className={`pick-badge ${pick === '1' ? 'p1' : pick === 'x' ? 'px' : 'p2'}`} style={{ fontSize: '0.7rem' }}>
                                {pick === '1' ? m.t1.split(' ')[0] : pick === 'x' ? 'EMP' : m.t2.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })}
                        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                          Mostrando primeros 15 partidos con pick
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Full picks matrix */}
            <div className="section-header">
              <h2>Matriz de Picks</h2>
              <span className="badge blue">Todos los usuarios</span>
            </div>
            <div className="table-scroll">
              <table className="picks-table">
                <thead>
                  <tr>
                    <th>Partido</th>
                    <th>Resultado</th>
                    {users.map(u => <th key={u.id} title={u.email}>{u.name.split(' ')[0]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <tr key={m.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{m.f1} {m.t1} <span style={{ color: 'rgba(255,255,255,0.3)' }}>vs</span> {m.t2} {m.f2}</td>
                      <td>
                        {results[m.id]
                          ? <span className={`pick-badge ${results[m.id] === '1' ? 'p1' : results[m.id] === 'x' ? 'px' : 'p2'}`}>{results[m.id] === '1' ? m.t1.split(' ')[0] : results[m.id] === 'x' ? 'EMP' : m.t2.split(' ')[0]}</span>
                          : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>—</span>
                        }
                      </td>
                      {users.map(u => {
                        const pick = picksMap[u.id]?.[m.id];
                        const isCorrect = pick && results[m.id] && pick === results[m.id];
                        if (!pick) return <td key={u.id} style={{ color: 'rgba(255,255,255,0.15)' }}>—</td>;
                        return (
                          <td key={u.id}>
                            <span className={`pick-badge ${pick === '1' ? 'p1' : pick === 'x' ? 'px' : 'p2'}`} style={isCorrect ? { background: 'var(--success)', color: 'var(--dark)' } : {}}>
                              {pick === '1' ? '1' : pick === 'x' ? 'X' : '2'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MATCHES TAB */}
        {activeTab === 'matches' && (
          <>
            <div className="section-header">
              <h2>Ingresar Resultados</h2>
              <span className="badge">{Object.values(results).filter(Boolean).length} / 72 ingresados</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
              Selecciona el resultado de cada partido para calcular los puntos automáticamente.
            </p>
            {Object.entries(groups).map(([gKey, g]) => {
              const groupMatches = matches.filter(m => m.group === gKey);
              return (
                <div key={gKey} style={{ marginBottom: '20px' }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: '1.1rem', letterSpacing: '2px', color: g.color, marginBottom: '8px', borderBottom: `1px solid ${g.color}44`, paddingBottom: '4px' }}>
                    GRUPO {gKey}
                  </div>
                  {groupMatches.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', minWidth: '60px' }}>{m.date} J{m.jornada}</span>
                      <span style={{ flex: 1, fontSize: '0.85rem', fontFamily: "'Barlow Condensed'", whiteSpace: 'nowrap' }}>{m.f1} {m.t1} vs {m.t2} {m.f2}</span>
                      <select
                        className="result-input"
                        value={results[m.id] || ''}
                        onChange={e => saveResult(m.id, e.target.value)}
                      >
                        <option value="">Sin resultado</option>
                        <option value="1">1 — {m.t1.split(' ')[0]}</option>
                        <option value="x">X — Empate</option>
                        <option value="2">2 — {m.t2.split(' ')[0]}</option>
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}

        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <>
            <div className="section-header">
              <h2>Resultados de Grupos</h2>
              <span className="badge">{Object.values(gResults).filter(r => r?.first).length} / 12 ingresados</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
              Ingresa qué equipos clasificaron 1° y 2° en cada grupo.
            </p>
            <div className="admin-grid">
              {Object.entries(groups).map(([gKey, g]) => {
                const r = gResults[gKey] || {};
                return (
                  <div key={gKey} className="user-card">
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: '1.1rem', letterSpacing: '2px', color: g.color, marginBottom: '12px' }}>GRUPO {gKey}</div>
                    <div style={{ marginBottom: '8px' }}>
                      <div className="qualified-label">1° Clasificado</div>
                      <select className="qualified-select" value={r.first || ''} onChange={e => saveGroupResult(gKey, 'first', e.target.value)}>
                        <option value="">— Sin resultado —</option>
                        {g.teams.map((t, i) => <option key={t} value={t}>{g.flag[i]} {t}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="qualified-label">2° Clasificado</div>
                      <select className="qualified-select" value={r.second || ''} onChange={e => saveGroupResult(gKey, 'second', e.target.value)}>
                        <option value="">— Sin resultado —</option>
                        {g.teams.map((t, i) => <option key={t} value={t}>{g.flag[i]} {t}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}
