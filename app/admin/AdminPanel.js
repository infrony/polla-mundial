'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { matches, groups } from '@/lib/data';
import Link from 'next/link';

const ADMIN_TABS = [
  { key: 'users',    icon: '👥', label: 'Participantes',     short: 'Usuarios'  },
  { key: 'matches',  icon: '⚽', label: 'Resultados Partidos', short: 'Partidos' },
  { key: 'groups',   icon: '🏆', label: 'Resultados Grupos',  short: 'Grupos'   },
  { key: 'knockout', icon: '🥇', label: 'Eliminatorias',      short: 'Elim.'    },
  { key: 'sync',     icon: '🔄', label: 'Sync API',           short: 'Sync'     },
  { key: 'email',    icon: '📧', label: 'Correos',            short: 'Correos'  },
];

const KNOCKOUT_ROUNDS = [
  { key: 'r32',   label: 'Dieciseisavos de Final', pts: 1  },
  { key: 'r16',   label: 'Octavos de Final',        pts: 2  },
  { key: 'qf',    label: 'Cuartos de Final',         pts: 4  },
  { key: 'sf',    label: 'Semifinal',                pts: 6  },
  { key: '3rd',   label: 'Tercer Lugar',             pts: 8  },
  { key: 'final', label: 'Gran Final',               pts: 8  },
];

export default function AdminPanel({ users, picks: initialPicks, groupPicks: initialGPicks, results: initialResults, groupResults: initialGResults, knockoutMatches: initialKO, knockoutResults: initialKOR, knockoutPicks: initialKOPicks }) {
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
  const [usersKOPaid, setUsersKOPaid] = useState(() => {
    const m = {};
    users.forEach(u => { m[u.id] = u.paid_knockout; });
    return m;
  });
  const [usersUnlocked, setUsersUnlocked] = useState(() => {
    const m = {};
    users.forEach(u => { m[u.id] = u.picks_unlocked; });
    return m;
  });
  const [usersGroupUnlocked, setUsersGroupUnlocked] = useState(() => {
    const m = {};
    users.forEach(u => { m[u.id] = u.group_picks_unlocked; });
    return m;
  });
  const [koMatches, setKoMatches] = useState(() => {
    const m = {};
    (initialKO || []).forEach(x => { m[x.id] = { ...x }; });
    return m;
  });
  const [koResults, setKoResults] = useState(() => {
    const m = {};
    (initialKOR || []).forEach(x => { m[x.match_id] = { winner: x.winner, result90: x.result_90 }; });
    return m;
  });
  const [koPicks] = useState(() => {
    const m = {};
    (initialKOPicks || []).forEach(p => {
      if (!m[p.user_id]) m[p.user_id] = {};
      m[p.user_id][p.match_id] = p.pick;
    });
    return m;
  });
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const adminNavRef  = useRef(null);
  const adminBtnRefs = useRef([]);
  const [adminPill, setAdminPill] = useState({ left: 0, width: 0, ready: false });
  const adminFirstRender = useRef(true);
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);   // weekly preview + rounds list
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState('');
  const [previewKey, setPreviewKey] = useState(null);       // null = weekly, else knockout round key
  const [koPreview, setKoPreview] = useState(null);         // currently previewed knockout round data
  const toastRef = useRef(null);

  const loadEmailPreview = useCallback(async () => {
    const res = await fetch('/api/admin/send-email');
    if (res.ok) setEmailPreview(await res.json());
  }, []);

  useEffect(() => {
    if (activeTab === 'email') loadEmailPreview();
  }, [activeTab, loadEmailPreview]);

  useEffect(() => {
    const idx = ADMIN_TABS.findIndex(t => t.key === activeTab);
    if (idx === -1) return;
    const nav = adminNavRef.current;
    const btn = adminBtnRefs.current[idx];
    if (!nav || !btn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setAdminPill({ left: btnRect.left - navRect.left, width: btnRect.width, ready: true });
    adminFirstRender.current = false;
  }, [activeTab]);

  async function previewRound(roundKey) {
    if (!roundKey) { setPreviewKey(null); return; }
    const res = await fetch(`/api/admin/send-email?round=${roundKey}`);
    if (res.ok) { setKoPreview({ ...(await res.json()), round: roundKey }); setPreviewKey(roundKey); }
  }

  async function sendEmail(test, roundKey = null) {
    const label = roundKey ? `la fase de eliminatorias` : `los participantes que ya pagaron`;
    if (!test && !confirm(`¿Enviar este correo a ${label}? Esta acción no se puede deshacer.`)) return;
    setEmailLoading(true);
    setEmailResult('');
    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test, round: roundKey || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEmailResult(test ? `✅ Correo de prueba enviado a ${data.to}` : `✅ Enviado a ${data.sent} participantes`);
      showToast(test ? '✅ Prueba enviada' : `✅ Enviado a ${data.sent}`);
    } else {
      const msg = data.error || (data.failures && data.failures.join('; ')) || 'Error al enviar';
      setEmailResult(`❌ ${msg}`);
      showToast('❌ Error al enviar');
    }
    setEmailLoading(false);
  }

  const loadSyncLogs = useCallback(async () => {
    const res = await fetch('/api/sync-results');
    if (res.ok) {
      const data = await res.json();
      setSyncLogs(data.logs || []);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sync') loadSyncLogs();
  }, [activeTab, loadSyncLogs]);

  async function runSync(mode) {
    setSyncLoading(true);
    const res = await fetch('/api/sync-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (res.ok) {
      const nf = data.notFound?.length ? ` (${data.notFound.length} no enc.)` : '';
      const ga = data.groupsAutoUpdated?.length ? ` · Grupos: ${data.groupsAutoUpdated.join(',')}` : '';
      const ka = data.knockoutAutoUpdated?.length ? ` · KO: ${data.knockoutAutoUpdated.length} acción(es)` : '';
      showToast(`✅ ${data.matchesUpdated} partidos${nf}${ga}${ka}`);
      await loadSyncLogs();
    } else {
      showToast(`❌ ${data.error}`);
    }
    setSyncLoading(false);
  }

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

  async function togglePicksUnlock(userId) {
    const newVal = !usersUnlocked[userId];
    setUsersUnlocked(p => ({ ...p, [userId]: newVal }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'picks_unlock', userId, unlocked: newVal }),
    });
    if (res.ok) showToast(newVal ? '🔓 Picks desbloqueados para este usuario' : '🔒 Picks bloqueados');
    else { setUsersUnlocked(p => ({ ...p, [userId]: !newVal })); showToast('❌ Error'); }
  }

  async function toggleGroupPicksUnlock(userId) {
    const newVal = !usersGroupUnlocked[userId];
    setUsersGroupUnlocked(p => ({ ...p, [userId]: newVal }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'group_picks_unlock', userId, unlocked: newVal }),
    });
    if (res.ok) showToast(newVal ? '🔓 Pronóstico de grupos desbloqueado' : '🔒 Pronóstico de grupos bloqueado');
    else { setUsersGroupUnlocked(p => ({ ...p, [userId]: !newVal })); showToast('❌ Error'); }
  }

  async function toggleKOPaid(userId) {
    const newVal = !usersKOPaid[userId];
    setUsersKOPaid(p => ({ ...p, [userId]: newVal }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knockout_payment', userId, paid: newVal }),
    });
    if (res.ok) showToast(newVal ? '✅ Inscripción eliminatoria confirmada ($10)' : '⚠️ Inscripción eliminatoria revocada');
    else { setUsersKOPaid(p => ({ ...p, [userId]: !newVal })); showToast('❌ Error'); }
  }

  async function saveKOTeams(matchId, team1, team2) {
    setKoMatches(m => ({ ...m, [matchId]: { ...m[matchId], team1, team2 } }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knockout_match_setup', matchId, team1, team2 }),
    });
    if (res.ok) showToast('✅ Equipos guardados');
    else showToast('❌ Error al guardar');
  }

  async function saveKOResult(matchId, result90, team1, team2) {
    const winner = result90 === '1' ? team1 : result90 === '2' ? team2 : null;
    setKoResults(r => ({ ...r, [matchId]: result90 ? { winner, result90 } : undefined }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knockout_result', matchId, result90, winner }),
    });
    if (res.ok) showToast(result90 ? '✅ Resultado guardado' : '🗑 Resultado eliminado');
    else showToast('❌ Error al guardar');
  }

  async function toggleKOLock(matchId, locked) {
    setKoMatches(m => ({ ...m, [matchId]: { ...m[matchId], locked } }));
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'knockout_lock', matchId, locked }),
    });
    if (!res.ok) { setKoMatches(m => ({ ...m, [matchId]: { ...m[matchId], locked: !locked } })); showToast('❌ Error'); }
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
            <img src="/logo.png" alt="FIFA World Cup 2026" style={{ width: 42, height: 42 }} />
            <div>
              <div className="header-title">Admin Panel</div>
              <div className="header-subtitle">Polla Mundial 2026</div>
            </div>
          </div>
          <Link href="/partidos" className="btn-sm">← Volver al juego</Link>
        </div>
      </header>

      {/* ── Mobile bottom nav (admin tabs) ── */}
      <nav className="admin-mobile-nav" ref={adminNavRef}>
        {adminPill.ready && (
          <span
            className="nav-slider"
            style={{
              left: adminPill.left,
              width: adminPill.width,
              transition: adminFirstRender.current ? 'none' : 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), width 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        )}
        {ADMIN_TABS.map((t, i) => (
          <button
            key={t.key}
            ref={el => { adminBtnRefs.current[i] = el; }}
            onClick={() => setActiveTab(t.key)}
            className={`admin-mobile-btn${activeTab === t.key ? ' active' : ''}`}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.short}</span>
          </button>
        ))}
      </nav>

      <div className="admin-wrapper">
        {/* Desktop tab bar — hidden on mobile */}
        <div className="admin-tab-bar">
          {ADMIN_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className="filter-btn" style={activeTab === t.key ? { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'rgba(255,255,255,0.06)' } : {}}>
              {t.icon} {t.label}
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
                      <div className="user-stat"><div className="user-stat-val" style={{ color: Object.keys(gPicksMap[u.id] || {}).length > 0 ? '#3498db' : 'rgba(255,255,255,0.25)' }}>{Object.keys(gPicksMap[u.id] || {}).length}/12</div><div className="user-stat-lbl">Grupos</div></div>
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
                    <button
                      onClick={e => { e.stopPropagation(); togglePicksUnlock(u.id); }}
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        padding: '7px',
                        border: `1px solid ${usersUnlocked[u.id] ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: '6px',
                        background: usersUnlocked[u.id] ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.03)',
                        color: usersUnlocked[u.id] ? '#F5A623' : 'rgba(255,255,255,0.35)',
                        fontFamily: "'Barlow Condensed'",
                        fontSize: '0.78rem',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {usersUnlocked[u.id] ? '🔓 Picks desbloqueados' : '🔒 Desbloquear picks fase grupos'}
                    </button>

                    <button
                      onClick={e => { e.stopPropagation(); toggleGroupPicksUnlock(u.id); }}
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        padding: '7px',
                        border: `1px solid ${usersGroupUnlocked[u.id] ? 'rgba(52,152,219,0.5)' : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: '6px',
                        background: usersGroupUnlocked[u.id] ? 'rgba(52,152,219,0.12)' : 'rgba(255,255,255,0.03)',
                        color: usersGroupUnlocked[u.id] ? '#3498db' : 'rgba(255,255,255,0.35)',
                        fontFamily: "'Barlow Condensed'",
                        fontSize: '0.78rem',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {usersGroupUnlocked[u.id] ? '🔓 Pronóstico grupos desbloqueado' : '🔒 Desbloquear pronóstico grupos'}
                    </button>

                    {selectedUser?.id === u.id && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>PRONÓSTICO DE GRUPOS</div>
                        {Object.entries(groups).map(([gKey, g]) => {
                          const gp = gPicksMap[u.id]?.[gKey];
                          if (!gp?.first && !gp?.second) return null;
                          const r = gResults[gKey] || {};
                          const firstOk = r.first && gp.first === r.first;
                          const secondOk = r.second && gp.second === r.second;
                          return (
                            <div key={gKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', fontSize: '0.75rem' }}>
                              <span style={{ color: g.color, fontFamily: "'Bebas Neue'", fontSize: '0.75rem', minWidth: '18px' }}>{gKey}</span>
                              <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                                {gp.first && (
                                  <span style={{ padding: '2px 7px', borderRadius: '4px', background: firstOk ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${firstOk ? '#2ecc71' : 'rgba(255,255,255,0.12)'}`, color: firstOk ? '#2ecc71' : 'rgba(255,255,255,0.7)', fontSize: '0.7rem', fontFamily: "'Barlow Condensed'" }}>
                                    1° {gp.first}
                                  </span>
                                )}
                                {gp.second && (
                                  <span style={{ padding: '2px 7px', borderRadius: '4px', background: secondOk ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${secondOk ? '#2ecc71' : 'rgba(255,255,255,0.12)'}`, color: secondOk ? '#2ecc71' : 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontFamily: "'Barlow Condensed'" }}>
                                    2° {gp.second}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {!Object.keys(gPicksMap[u.id] || {}).length && (
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontFamily: "'Barlow Condensed'" }}>Sin pronósticos de grupos</div>
                        )}
                        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', margin: '10px 0 8px' }}>PICKS DE PARTIDOS</div>
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

            {/* Group picks matrix */}
            <div className="section-header" style={{ marginTop: '28px' }}>
              <h2>Pronósticos de Grupos</h2>
              <span className="badge blue">Todos los usuarios</span>
            </div>
            <div className="table-scroll">
              <table className="picks-table">
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th>Resultado</th>
                    {users.map(u => <th key={u.id} title={u.email}>{u.name.split(' ')[0]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groups).map(([gKey, g]) => {
                    const r = gResults[gKey] || {};
                    return (
                      <tr key={gKey}>
                        <td style={{ color: g.color, fontFamily: "'Bebas Neue'", fontSize: '0.85rem', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                          GRUPO {gKey}
                        </td>
                        <td style={{ fontSize: '0.7rem', fontFamily: "'Barlow Condensed'", lineHeight: 1.5, whiteSpace: 'nowrap' }}>
                          {r.first ? <div style={{ color: 'rgba(255,255,255,0.7)' }}>1° {r.first}</div> : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                          {r.second && <div style={{ color: 'rgba(255,255,255,0.45)' }}>2° {r.second}</div>}
                        </td>
                        {users.map(u => {
                          const gp = gPicksMap[u.id]?.[gKey];
                          if (!gp?.first && !gp?.second) return <td key={u.id} style={{ color: 'rgba(255,255,255,0.15)' }}>—</td>;
                          const firstOk = r.first && gp.first === r.first;
                          const secondOk = r.second && gp.second === r.second;
                          return (
                            <td key={u.id} style={{ fontSize: '0.7rem', fontFamily: "'Barlow Condensed'", lineHeight: 1.5, whiteSpace: 'nowrap' }}>
                              {gp.first && (
                                <div style={{ color: firstOk ? '#2ecc71' : 'rgba(255,255,255,0.7)' }}>
                                  {firstOk ? '✓' : ''} {gp.first}
                                </div>
                              )}
                              {gp.second && (
                                <div style={{ color: secondOk ? '#2ecc71' : 'rgba(255,255,255,0.4)' }}>
                                  {secondOk ? '✓' : ''} {gp.second}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
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

        {/* KNOCKOUT TAB */}
        {activeTab === 'knockout' && (
          <>
            {/* Payment section */}
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h2>Inscripciones Eliminatorias ($10)</h2>
              <span className="badge gold">
                💰 {Object.values(usersKOPaid).filter(Boolean).length} / {users.length} pagaron
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleKOPaid(u.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem',
                    fontFamily: "'Barlow Condensed'", letterSpacing: '1px', transition: 'all 0.2s',
                    background: usersKOPaid[u.id] ? 'rgba(46,204,113,0.12)' : 'rgba(200,16,46,0.08)',
                    border: `1px solid ${usersKOPaid[u.id] ? '#2ecc71' : 'rgba(200,16,46,0.4)'}`,
                    color: usersKOPaid[u.id] ? '#2ecc71' : '#ff6b7a',
                  }}
                >
                  {usersKOPaid[u.id] ? '✓' : '✗'} {u.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Quick sync button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => runSync('today')}
                disabled={syncLoading}
                style={{
                  padding: '8px 18px', borderRadius: 8, cursor: syncLoading ? 'not-allowed' : 'pointer',
                  background: syncLoading ? 'rgba(255,255,255,0.04)' : 'rgba(91,156,246,0.12)',
                  border: '1px solid rgba(91,156,246,0.4)', color: syncLoading ? 'rgba(255,255,255,0.3)' : '#5b9cf6',
                  fontFamily: "'Barlow Condensed'", fontSize: '0.85rem', letterSpacing: '1px', transition: 'all 0.2s',
                }}
              >
                {syncLoading ? '⏳ Sincronizando...' : '🔄 Poblar bracket desde API'}
              </button>
              <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                Jala los equipos de R32 automáticamente si la API ya los tiene
              </span>
            </div>

            {/* Match setup + results per round */}
            {KNOCKOUT_ROUNDS.map(({ key, label, pts }) => {
              const roundMatches = Object.values(koMatches).filter(m => m.round === key).sort((a,b) => a.match_number - b.match_number);
              return (
                <div key={key} style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: '1rem', letterSpacing: '2px', color: '#F5A623', marginBottom: 10, borderBottom: '1px solid rgba(245,166,35,0.2)', paddingBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {label}
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'Barlow Condensed'", letterSpacing: '1px' }}>+{pts} pts por acierto</span>
                  </div>
                  {roundMatches.map(m => {
                    const koResult = koResults[m.id];
                    const locked = m.locked;
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', minWidth: 80 }}>#{m.match_number} {m.match_date && <span style={{ color: 'rgba(255,255,255,0.4)' }}>{m.match_date}</span>}</span>
                        <KOTeamInput
                          placeholder="Equipo 1"
                          value={m.team1 || ''}
                          onBlur={val => saveKOTeams(m.id, val, m.team2 || '')}
                          listId={`ko-t1-${m.id}`}
                        />
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Bebas Neue'", fontSize: '0.8rem' }}>vs</span>
                        <KOTeamInput
                          placeholder="Equipo 2"
                          value={m.team2 || ''}
                          onBlur={val => saveKOTeams(m.id, m.team1 || '', val)}
                          listId={`ko-t2-${m.id}`}
                        />
                        {m.team1 && m.team2 && (
                          <select
                            className="result-input"
                            value={koResult?.result90 || ''}
                            onChange={e => saveKOResult(m.id, e.target.value, m.team1, m.team2)}
                            style={{ minWidth: 160 }}
                          >
                            <option value="">Sin resultado</option>
                            <option value="1">1 — {m.team1}</option>
                            <option value="x">X — Empate</option>
                            <option value="2">2 — {m.team2}</option>
                          </select>
                        )}
                        <button
                          onClick={() => toggleKOLock(m.id, !locked)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.7rem',
                            fontFamily: "'Barlow Condensed'", letterSpacing: '1px',
                            background: locked ? 'rgba(200,16,46,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${locked ? 'rgba(200,16,46,0.4)' : 'var(--border)'}`,
                            color: locked ? '#ff6b7a' : 'rgba(255,255,255,0.35)',
                          }}
                        >
                          {locked ? '🔒' : '🔓'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Knockout picks matrix */}
            <div className="section-header" style={{ marginTop: 28 }}>
              <h2>Picks por Participante</h2>
              <span className="badge blue">Fase Eliminatoria</span>
            </div>
            <div className="table-scroll">
              <table className="picks-table">
                <thead>
                  <tr>
                    <th>Partido</th>
                    <th>Resultado</th>
                    {users.filter(u => u.paid_knockout).map(u => (
                      <th key={u.id} title={u.email}>{u.name.split(' ')[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KNOCKOUT_ROUNDS.map(({ key, label }) => {
                    const roundMatches = Object.values(koMatches).filter(m => m.round === key).sort((a,b) => a.match_number - b.match_number);
                    const hasAnyMatch = roundMatches.some(m => m.team1 || m.team2);
                    if (!hasAnyMatch) return null;
                    return [
                      <tr key={`header-${key}`}>
                        <td colSpan={2 + users.filter(u => u.paid_knockout).length} style={{
                          fontFamily: "'Bebas Neue'", fontSize: '0.8rem', letterSpacing: '2px',
                          color: '#F5A623', background: 'rgba(245,166,35,0.06)',
                          padding: '6px 10px', borderBottom: '1px solid rgba(245,166,35,0.15)',
                        }}>
                          {label}
                        </td>
                      </tr>,
                      ...roundMatches.filter(m => m.team1 || m.team2).map(m => {
                        const r90 = koResults[m.id]?.result90 ?? null;
                        const teamLabel = m.team1 && m.team2
                          ? `${m.team1.split(' ')[0]} vs ${m.team2.split(' ')[0]}`
                          : m.team1 || m.team2 || `#${m.match_number}`;
                        return (
                          <tr key={m.id}>
                            <td style={{ whiteSpace: 'nowrap', fontFamily: "'Barlow Condensed'", fontSize: '0.78rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>#{m.match_number}</span>
                              {teamLabel}
                            </td>
                            <td>
                              {r90
                                ? <span className={`pick-badge ${r90 === '1' ? 'p1' : r90 === 'x' ? 'px' : 'p2'}`}>{r90 === '1' ? '1' : r90 === 'x' ? 'X' : '2'}</span>
                                : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>—</span>
                              }
                            </td>
                            {users.filter(u => u.paid_knockout).map(u => {
                              const pick = koPicks[u.id]?.[m.id];
                              const isCorrect = pick && r90 && pick === r90;
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
                        );
                      }),
                    ];
                  })}
                </tbody>
              </table>
            </div>
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
        {/* SYNC TAB */}
        {activeTab === 'sync' && (
          <>
            <div className="section-header">
              <h2>Sincronización API</h2>
              <span className="badge blue">worldcup26.ir</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
              API gratuita sin límite de requests. Usa <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Todos</strong> para actualizar todos los partidos con resultado. Usa <strong style={{ color: 'rgba(255,255,255,0.7)' }}>EN VIVO</strong> durante partidos activos para sincronizar solo los que están en juego.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <button
                onClick={() => runSync('today')}
                disabled={syncLoading}
                style={{
                  padding: '10px 20px', borderRadius: '8px', cursor: syncLoading ? 'not-allowed' : 'pointer',
                  background: syncLoading ? 'rgba(255,255,255,0.04)' : 'rgba(0,61,165,0.25)',
                  border: '1px solid rgba(0,61,165,0.6)', color: syncLoading ? 'rgba(255,255,255,0.3)' : '#fff',
                  fontFamily: "'Barlow Condensed'", fontSize: '0.9rem', letterSpacing: '1px',
                  transition: 'all 0.2s',
                }}
              >
                {syncLoading ? '⏳ Sincronizando...' : '📅 Sincronizar Todos'}
              </button>
              <button
                onClick={() => runSync('live')}
                disabled={syncLoading}
                style={{
                  padding: '10px 20px', borderRadius: '8px', cursor: syncLoading ? 'not-allowed' : 'pointer',
                  background: syncLoading ? 'rgba(255,255,255,0.04)' : 'rgba(46,204,113,0.12)',
                  border: '1px solid rgba(46,204,113,0.4)', color: syncLoading ? 'rgba(255,255,255,0.3)' : '#2ecc71',
                  fontFamily: "'Barlow Condensed'", fontSize: '0.9rem', letterSpacing: '1px',
                  transition: 'all 0.2s',
                }}
              >
                {syncLoading ? '⏳ Sincronizando...' : '🔴 Sincronizar EN VIVO'}
              </button>
              <button
                onClick={loadSyncLogs}
                style={{
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow Condensed'",
                  fontSize: '0.85rem', letterSpacing: '1px',
                }}
              >
                ↺ Actualizar log
              </button>
            </div>

            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
              HISTORIAL DE SINCRONIZACIONES
            </div>

            {syncLogs.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Sin sincronizaciones aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {syncLogs.map(log => (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: log.error_message ? 'rgba(200,16,46,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${log.error_message ? 'rgba(200,16,46,0.3)' : 'var(--border)'}`,
                    flexWrap: 'wrap', fontSize: '0.78rem', fontFamily: "'Barlow Condensed'",
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', minWidth: '130px' }}>
                      {new Date(log.synced_at).toLocaleString('es', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', letterSpacing: '1px',
                      background: log.mode === 'live' ? 'rgba(46,204,113,0.15)' : 'rgba(0,61,165,0.2)',
                      border: `1px solid ${log.mode === 'live' ? 'rgba(46,204,113,0.4)' : 'rgba(0,61,165,0.4)'}`,
                      color: log.mode === 'live' ? '#2ecc71' : '#5b9ef4',
                    }}>
                      {log.mode === 'live' ? 'EN VIVO' : 'TODOS'}
                    </span>
                    {log.error_message ? (
                      <span style={{ color: '#ff6b7a' }}>❌ {log.error_message}</span>
                    ) : (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>⚽ {log.matches_updated} partidos</span>
                        {log.not_found && (
                          <span style={{ color: '#F5A623', fontSize: '0.7rem' }} title={log.not_found}>
                            ⚠ no encontrados: {log.not_found}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '24px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'Barlow Condensed'", lineHeight: 1.6 }}>
              <strong style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '1px' }}>ESTRATEGIA RECOMENDADA</strong><br />
              • Días sin partidos: no sincronizar<br />
              • Días con partidos (antes del inicio): sync "Todos" 1 vez para cargar fixtures<br />
              • Durante partidos: sync "EN VIVO" cada 15-30 min para scores en tiempo real<br />
              • Después de terminar todos: sync "Todos" 1 vez final para scores definitivos<br />
              • Sin límite de requests — API gratuita (worldcup26.ir)
            </div>
          </>
        )}

        {/* EMAIL TAB */}
        {activeTab === 'email' && (
          <>
            <div className="section-header">
              <h2>Correos Masivos</h2>
              <span className="badge blue">{emailPreview?.recipientCount ?? '…'} pagados</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
              Resumen semanal personalizado de los pronósticos y los partidos de la próxima semana.
              Solo se envía a los participantes que ya pagaron su inscripción. Cada correo se personaliza con los puntos, posición y picks de cada usuario.
            </p>
            <p style={{ fontSize: '0.74rem', color: 'rgba(245,166,35,0.85)', marginBottom: '16px', fontFamily: "'Barlow Condensed'", letterSpacing: '0.5px' }}>
              🤖 Envío automático: cada domingo 22:00 UTC durante la fase de grupos (se detiene el 1 de julio 2026). Aquí puedes enviarlo manualmente cuando quieras.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px', fontSize: '0.8rem', fontFamily: "'Barlow Condensed'", color: 'rgba(255,255,255,0.55)' }}>
              <div>De: <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{emailPreview?.from || 'mundial@infrony.app'}</strong></div>
              <div>Asunto: <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{emailPreview?.subject || '…'}</strong></div>
              <div>Prueba se envía a: <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{emailPreview?.testRecipient || 'infrony@gmail.com'}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <button
                onClick={() => sendEmail(true)}
                disabled={emailLoading || !emailPreview}
                style={{
                  padding: '10px 20px', borderRadius: '8px', cursor: emailLoading ? 'not-allowed' : 'pointer',
                  background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.5)',
                  color: emailLoading ? 'rgba(255,255,255,0.3)' : '#F5A623',
                  fontFamily: "'Barlow Condensed'", fontSize: '0.9rem', letterSpacing: '1px', transition: 'all 0.2s',
                }}
              >
                {emailLoading ? '⏳ Enviando...' : '✉️ Enviar prueba a mi correo'}
              </button>
              <button
                onClick={() => sendEmail(false)}
                disabled={emailLoading || !emailPreview}
                style={{
                  padding: '10px 20px', borderRadius: '8px', cursor: emailLoading ? 'not-allowed' : 'pointer',
                  background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.4)',
                  color: emailLoading ? 'rgba(255,255,255,0.3)' : '#2ecc71',
                  fontFamily: "'Barlow Condensed'", fontSize: '0.9rem', letterSpacing: '1px', transition: 'all 0.2s',
                }}
              >
                {emailLoading ? '⏳ Enviando...' : `📤 Enviar a los que pagaron (${emailPreview?.recipientCount ?? 0})`}
              </button>
            </div>

            {emailResult && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '20px',
                background: emailResult.startsWith('✅') ? 'rgba(46,204,113,0.08)' : 'rgba(200,16,46,0.08)',
                border: `1px solid ${emailResult.startsWith('✅') ? 'rgba(46,204,113,0.3)' : 'rgba(200,16,46,0.3)'}`,
                color: emailResult.startsWith('✅') ? '#2ecc71' : '#ff6b7a',
                fontFamily: "'Barlow Condensed'", fontSize: '0.85rem',
              }}>
                {emailResult}
              </div>
            )}

            {/* KNOCKOUT ROUNDS */}
            <div className="section-header" style={{ marginTop: '8px' }}>
              <h2>Eliminatorias</h2>
              <span className="badge gold">Resumen al cierre de cada fase</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
              Resumen de cada fase para los inscritos en eliminatorias (los que pagaron $10). Cada fase solo se puede enviar una vez que ha comenzado.
            </p>
            <p style={{ fontSize: '0.74rem', color: 'rgba(245,166,35,0.85)', marginBottom: '16px', fontFamily: "'Barlow Condensed'", letterSpacing: '0.5px' }}>
              🤖 Envío automático: un resumen por fase se envía solo al cierre de cada fase (revisión diaria 09:00 UTC). El envío manual aquí también marca la fase como enviada para no duplicar.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {(emailPreview?.rounds || []).map(r => (
                <div key={r.key} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                  padding: '10px 12px', borderRadius: '8px',
                  background: previewKey === r.key ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${previewKey === r.key ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
                }}>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: '0.95rem', letterSpacing: '1px', color: '#F5A623', minWidth: '190px' }}>{r.label}</span>
                  <span style={{
                    fontFamily: "'Barlow Condensed'", fontSize: '0.72rem', letterSpacing: '1px', padding: '2px 8px', borderRadius: '4px',
                    background: r.started ? 'rgba(46,204,113,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${r.started ? 'rgba(46,204,113,0.4)' : 'var(--border)'}`,
                    color: r.started ? '#2ecc71' : 'rgba(255,255,255,0.4)',
                  }}>
                    {r.started ? '● En curso / finalizada' : `🔒 Inicia ${new Date(r.startsAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}`}
                  </span>
                  {r.sent && (
                    <span style={{
                      fontFamily: "'Barlow Condensed'", fontSize: '0.72rem', letterSpacing: '1px', padding: '2px 8px', borderRadius: '4px',
                      background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.4)', color: '#5b9ef4',
                    }}>
                      ✓ Resumen enviado
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <button onClick={() => previewRound(r.key)} className="btn-sm" style={{ fontSize: '0.72rem' }}>👁 Vista previa</button>
                    <button
                      onClick={() => sendEmail(true, r.key)}
                      disabled={emailLoading || !r.started}
                      className="btn-sm"
                      style={{ fontSize: '0.72rem', opacity: r.started ? 1 : 0.4, cursor: r.started ? 'pointer' : 'not-allowed', color: '#F5A623' }}
                    >✉️ Prueba</button>
                    <button
                      onClick={() => sendEmail(false, r.key)}
                      disabled={emailLoading || !r.started}
                      className="btn-sm"
                      style={{ fontSize: '0.72rem', opacity: r.started ? 1 : 0.4, cursor: r.started ? 'pointer' : 'not-allowed', color: '#2ecc71' }}
                    >📤 Enviar a inscritos</button>
                  </div>
                </div>
              ))}
            </div>

            {/* PREVIEW */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)' }}>
                VISTA PREVIA — {previewKey ? `Eliminatorias: ${koPreview?.subject || ''}` : 'Resumen semanal'}
              </div>
              {previewKey && (
                <button onClick={() => previewRound(null)} className="btn-sm" style={{ fontSize: '0.7rem' }}>↩ Ver resumen semanal</button>
              )}
            </div>
            {(previewKey ? koPreview?.html : emailPreview?.html) ? (
              <iframe
                title="Vista previa del correo"
                srcDoc={previewKey ? koPreview.html : emailPreview.html}
                style={{ width: '100%', height: '720px', border: '1px solid var(--border)', borderRadius: '10px', background: '#0a0e1a' }}
              />
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Cargando vista previa…</p>
            )}
          </>
        )}
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}

const ALL_TEAMS = [
  'México','Sudáfrica','Corea del Sur','Rep. Checa',
  'Canadá','Bosnia y H.','Catar','Suiza',
  'Brasil','Marruecos','Haití','Escocia',
  'EEUU','Paraguay','Australia','Turquía',
  'Alemania','Curazao','C. de Marfil','Ecuador',
  'Países Bajos','Japón','Suecia','Túnez',
  'Bélgica','Egipto','Irán','N. Zelanda',
  'España','Cabo Verde','A. Saudita','Uruguay',
  'Francia','Senegal','Irak','Noruega',
  'Argentina','Argelia','Austria','Jordania',
  'Portugal','RD Congo','Uzbekistán','Colombia',
  'Inglaterra','Croacia','Ghana','Panamá',
];

function KOTeamInput({ placeholder, value, onBlur, listId }) {
  const [local, setLocal] = useState(value);
  // Use a ref so onBlur always reads the latest value even when onChange and blur
  // fire in the same React tick (happens when picking from a datalist suggestion).
  const latestRef = useRef(value);

  useEffect(() => {
    setLocal(value);
    latestRef.current = value;
  }, [value]);

  return (
    <>
      {listId && (
        <datalist id={listId}>
          {ALL_TEAMS.map(t => <option key={t} value={t} />)}
        </datalist>
      )}
      <input
        type="text"
        list={listId}
        value={local}
        placeholder={placeholder}
        onChange={e => { latestRef.current = e.target.value; setLocal(e.target.value); }}
        onBlur={() => { if (latestRef.current !== value) onBlur(latestRef.current); }}
        style={{
          flex: 1, minWidth: 110, maxWidth: 160, padding: '5px 10px', borderRadius: 6,
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
          color: '#fff', fontFamily: "'Barlow Condensed'", fontSize: '0.82rem',
          outline: 'none',
        }}
      />
    </>
  );
}
