'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

const ROUNDS = [
  { key: 'r32',   label: 'Dieciseisavos de Final', pts: 1  },
  { key: 'r16',   label: 'Octavos de Final',        pts: 2  },
  { key: 'qf',    label: 'Cuartos de Final',         pts: 4  },
  { key: 'sf',    label: 'Semifinal',                pts: 6  },
  { key: '3rd',   label: 'Tercer Lugar',             pts: 8  },
  { key: 'final', label: 'Gran Final',               pts: 8  },
];

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Panama' });
}

export default function KnockoutView({ initialMatches, initialPicks, initialResults, paidKnockout }) {
  const [picks,   setPicks]   = useState(() => {
    const m = {};
    initialPicks.forEach(p => { m[p.match_id] = p.pick; });
    return m;
  });
  const [results, setResults] = useState(() => {
    const m = {};
    initialResults.forEach(r => { m[r.match_id] = r.winner; });
    return m;
  });
  const [saving,     setSaving]     = useState({});
  const [toast,      setToast]      = useState('');
  const [showRules,  setShowRules]  = useState(false);
  const toastRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2500);
  }

  const handlePick = useCallback(async (matchId, team) => {
    if (!paidKnockout) { showToast('Necesitas inscribirte ($10) para participar.'); return; }
    const prev = picks[matchId];
    if (prev === team) return;
    setSaving(s => ({ ...s, [matchId]: true }));
    setPicks(p => ({ ...p, [matchId]: team }));
    try {
      const res = await fetch('/api/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, pick: team }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPicks(p => ({ ...p, [matchId]: prev }));
      showToast('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(s => ({ ...s, [matchId]: false }));
    }
  }, [picks, paidKnockout]);

  const byRound = {};
  initialMatches.forEach(m => {
    if (!byRound[m.round]) byRound[m.round] = [];
    byRound[m.round].push(m);
  });

  let totalPts = 0, correct = 0;
  initialMatches.forEach(m => {
    const winner = results[m.id];
    if (winner && picks[m.id] === winner) {
      totalPts += ROUNDS.find(r => r.key === m.round)?.pts ?? 1;
      correct++;
    }
  });

  const now = Date.now();

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 20px' }}>
      {/* Rules modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Score summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {[
          { val: totalPts,                    lbl: 'Puntos',      color: '#F5A623', bg: 'rgba(245,166,35,0.1)',   border: 'rgba(245,166,35,0.3)' },
          { val: correct,                     lbl: 'Aciertos',    color: '#2ecc71', bg: 'rgba(46,204,113,0.08)',  border: 'rgba(46,204,113,0.25)' },
          { val: Object.keys(picks).length,   lbl: 'Picks hechos',color: '#5b9cf6', bg: 'rgba(91,156,246,0.08)', border: 'rgba(91,156,246,0.25)' },
        ].map(({ val, lbl, color, bg, border }) => (
          <div key={lbl} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 20px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: '2rem', color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.65rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>{lbl}</div>
          </div>
        ))}
        <button
          onClick={() => setShowRules(true)}
          title="Ver reglas"
          style={{
            background: 'rgba(91,156,246,0.08)', border: '1px solid rgba(91,156,246,0.25)',
            borderRadius: 10, padding: '10px 16px', cursor: 'pointer', flexShrink: 0,
            color: '#5b9cf6', fontFamily: "'Bebas Neue'", fontSize: '1.1rem', letterSpacing: '1px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}
        >
          <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>?</span>
          <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.6rem', letterSpacing: '2px', color: 'rgba(91,156,246,0.7)', textTransform: 'uppercase' }}>Reglas</span>
        </button>
      </div>

      {ROUNDS.map(({ key, label, pts }) => {
        const roundMatches = byRound[key] || [];
        const allEmpty = roundMatches.every(m => !m.team1 && !m.team2);

        // Round open check (use first match's picks_open_from as representative)
        const opensAt   = roundMatches[0]?.picks_open_from;
        const roundOpen = !opensAt || now >= new Date(opensAt).getTime();

        return (
          <div key={key} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.1rem', letterSpacing: '2px', color: '#fff', margin: 0 }}>
                {label}
              </h3>
              <span style={{
                fontFamily: "'Barlow Condensed'", fontSize: '0.65rem', letterSpacing: '2px',
                color: '#F5A623', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)',
                borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase',
              }}>+{pts} pts</span>

              {!roundOpen && (
                <span style={{
                  fontFamily: "'Barlow Condensed'", fontSize: '0.68rem', letterSpacing: '1px',
                  color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 10px',
                }}>
                  🕐 Disponible desde {fmtDate(opensAt)}
                </span>
              )}

              {roundOpen && allEmpty && (
                <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.65rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
                  Equipos por definir
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {roundMatches.map(m => {
                const winner   = results[m.id];
                const myPick   = picks[m.id];
                const hasTeams = m.team1 && m.team2;
                const matchOpen = !m.picks_open_from || now >= new Date(m.picks_open_from).getTime();
                const isLocked  = m.locked || !!winner || !matchOpen || !paidKnockout;
                const isSaving  = saving[m.id];

                // Label for disabled state
                let disabledReason = null;
                if (!paidKnockout)  disabledReason = '🔒 Inscríbete por $10';
                else if (!matchOpen) disabledReason = `🕐 Abre el ${fmtDate(m.picks_open_from)}`;
                else if (m.locked)   disabledReason = '🔒 Cerrado';

                return (
                  <div key={m.id} style={{
                    background: 'rgba(18,18,31,0.9)',
                    border: `1px solid ${winner ? 'rgba(46,204,113,0.2)' : !paidKnockout || !matchOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10, padding: '12px 14px',
                    opacity: (!paidKnockout || !matchOpen) && !winner ? 0.75 : 1,
                  }}>
                    {/* Match header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.6rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
                        #{m.match_number}
                      </span>
                      {m.match_date && (
                        <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>
                          📅 {m.match_date}
                        </span>
                      )}
                      {winner && <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.62rem', color: '#2ecc71', marginLeft: 'auto' }}>✓ Resultado</span>}
                      {disabledReason && !winner && (
                        <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                          {disabledReason}
                        </span>
                      )}
                    </div>

                    {!hasTeams ? (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontFamily: "'Barlow Condensed'", fontSize: '0.8rem', padding: '8px 0' }}>
                        Equipos por definir
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <TeamButton team={m.team1} pick={myPick} winner={winner} locked={isLocked} saving={isSaving} onClick={() => handlePick(m.id, m.team1)} />
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>VS</div>
                        <TeamButton team={m.team2} pick={myPick} winner={winner} locked={isLocked} saving={isSaving} onClick={() => handlePick(m.id, m.team2)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}

function RulesModal({ onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const rows = [
    { round: 'Dieciseisavos (R32)', pts: 1,  icon: '⚽' },
    { round: 'Octavos (R16)',        pts: 2,  icon: '⚽' },
    { round: 'Cuartos de Final',     pts: 4,  icon: '🏅' },
    { round: 'Semifinal',            pts: 6,  icon: '🥈' },
    { round: '3° Puesto / Final',    pts: 8,  icon: '🏆' },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgb(18,18,31)', border: '1px solid rgba(91,156,246,0.3)',
          borderRadius: 16, padding: '28px 24px', maxWidth: 480, width: '100%',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 4,
          }}
        >✕</button>

        <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.4rem', letterSpacing: '3px', color: '#fff', margin: '0 0 4px' }}>
          🏆 Reglas — Fase Eliminatoria
        </h2>
        <p style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 20px', letterSpacing: '0.5px' }}>
          Cómo ganar puntos en la fase eliminatoria
        </p>

        {/* How it works */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', letterSpacing: '2px', color: '#5b9cf6', textTransform: 'uppercase', marginBottom: 10 }}>
            ¿Cómo funciona?
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Elige al equipo que crees que ganará cada partido.',
              'El ganador se determina al finalizar los 90 minutos reglamentarios.',
              'Si aciertas, ganas los puntos de esa ronda.',
              'Los picks se habilitan ronda por ronda, antes del inicio de cada fase.',
              'Una vez que el partido empieza, tu pick queda bloqueado.',
            ].map((txt, i) => (
              <li key={i} style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                {txt}
              </li>
            ))}
          </ul>
        </div>

        {/* Points table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.7rem', letterSpacing: '2px', color: '#5b9cf6', textTransform: 'uppercase', marginBottom: 10 }}>
            Puntos por ronda
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map(({ round, pts, icon }) => (
              <div key={round} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '8px 14px',
              }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>
                  {icon} {round}
                </span>
                <span style={{
                  fontFamily: "'Bebas Neue'", fontSize: '1rem', color: '#F5A623',
                  background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)',
                  borderRadius: 20, padding: '1px 12px', letterSpacing: '1px',
                }}>
                  +{pts} {pts === 1 ? 'pt' : 'pts'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Inscription note */}
        <div style={{
          background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)',
          borderRadius: 10, padding: '10px 14px',
          fontFamily: "'Barlow Condensed'", fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
        }}>
          <strong style={{ color: '#F5A623' }}>Inscripción:</strong> Para participar en la fase eliminatoria debes pagar <strong style={{ color: '#F5A623' }}>$10</strong> al administrador. Tus picks solo cuentan si estás inscrito.
        </div>
      </div>
    </div>
  );
}

function TeamButton({ team, pick, winner, locked, saving, onClick }) {
  const isSelected = pick === team;
  const isWinner   = winner === team;
  const isLoser    = winner && winner !== team;

  let bg = 'rgba(255,255,255,0.04)', border = 'rgba(255,255,255,0.1)', color = 'rgba(255,255,255,0.7)';
  if (isWinner)        { bg = 'rgba(46,204,113,0.15)'; border = '#2ecc71';  color = '#2ecc71'; }
  else if (isLoser)    { /* handled via opacity below */ }
  else if (isSelected) { bg = 'rgba(0,61,165,0.25)';  border = '#5b9cf6';  color = '#fff'; }

  return (
    <button
      onClick={onClick}
      disabled={locked || saving}
      style={{
        flex: 1, padding: '9px 8px', borderRadius: 8,
        cursor: locked ? 'default' : 'pointer',
        background: bg, border: `1px solid ${border}`, color,
        fontFamily: "'Barlow Condensed'", fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px',
        textAlign: 'center', transition: 'all 0.18s',
        opacity: isLoser ? 0.3 : 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      {saving ? '...' : team}
    </button>
  );
}
