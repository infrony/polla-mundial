'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { groups } from '@/lib/data';

// Build team-name → ISO code map from group definitions
const TEAM_ISO = {};
Object.values(groups).forEach(g => {
  g.teams.forEach((team, i) => { TEAM_ISO[team] = g.iso[i]; });
});

function Flag({ team, size = 22 }) {
  const iso = TEAM_ISO[team];
  if (!iso) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={team}
      style={{ width: size, height: Math.round(size * 0.67), objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
    />
  );
}

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
    initialResults.forEach(r => { m[r.match_id] = { winner: r.winner, result90: r.result_90 }; });
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

  const handlePick = useCallback(async (matchId, pick) => {
    if (!paidKnockout) { showToast('Necesitas inscribirte ($10) para participar.'); return; }
    const prev = picks[matchId];
    if (prev === pick) return;
    setSaving(s => ({ ...s, [matchId]: true }));
    setPicks(p => ({ ...p, [matchId]: pick }));
    try {
      const res = await fetch('/api/knockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, pick }),
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
    const r90 = results[m.id]?.result90;
    if (r90 && picks[m.id] === r90) {
      totalPts += ROUNDS.find(r => r.key === m.round)?.pts ?? 1;
      correct++;
    }
  });

  const now = Date.now();

  const r32Matches = byRound['r32'] || [];
  const r32HasAnyTeam = r32Matches.some(m => m.team1 || m.team2);
  const r32AllEmpty = r32Matches.length > 0 && r32Matches.every(m => !m.team1 && !m.team2);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 20px' }}>
      {/* Rules modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Banner: bracket pending */}
      {paidKnockout && r32AllEmpty && (
        <div style={{
          background: 'rgba(91,156,246,0.07)', border: '1px solid rgba(91,156,246,0.25)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontFamily: "'Barlow Condensed'", fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
        }}>
          <strong style={{ color: '#5b9cf6' }}>🏆 ¡Estás inscrito!</strong> Los partidos del R32 se están confirmando. Tan pronto el bracket esté listo podrás seleccionar tus picks. El primer partido es el <strong style={{ color: '#fff' }}>28 de junio</strong>.
        </div>
      )}

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
                <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.68rem', letterSpacing: '1px', color: 'rgba(245,166,35,0.7)', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 20, padding: '2px 10px' }}>
                  ⏳ Confirmando clasificados...
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {roundMatches.map(m => {
                const matchResult = results[m.id];
                const r90        = matchResult?.result90 ?? null;
                const myPick     = picks[m.id];
                const hasAnyTeam = m.team1 || m.team2;
                const hasBothTeams = m.team1 && m.team2;
                const matchOpen  = !m.picks_open_from || now >= new Date(m.picks_open_from).getTime();
                // Picks need both teams confirmed + open + paid + not locked
                const isLocked   = m.locked || !!r90 || !matchOpen || !paidKnockout || !hasBothTeams;
                const isSaving   = saving[m.id];

                let disabledReason = null;
                if (!paidKnockout)    disabledReason = '🔒 Inscríbete por $10';
                else if (!matchOpen)  disabledReason = `🕐 Abre el ${fmtDate(m.picks_open_from)}`;
                else if (m.locked)    disabledReason = '🔒 Cerrado';
                else if (!hasBothTeams && hasAnyTeam) disabledReason = '⏳ Equipo por definir';

                return (
                  <div key={m.id} style={{
                    background: 'rgba(18,18,31,0.9)',
                    border: `1px solid ${r90 ? 'rgba(46,204,113,0.2)' : !paidKnockout || !matchOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10, padding: '12px 14px',
                    opacity: (!paidKnockout || !matchOpen) && !r90 ? 0.75 : 1,
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
                      {r90 && <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.62rem', color: '#2ecc71', marginLeft: 'auto' }}>✓ Resultado</span>}
                      {disabledReason && !r90 && (
                        <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                          {disabledReason}
                        </span>
                      )}
                    </div>

                    {!hasAnyTeam ? (
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontFamily: "'Barlow Condensed'", fontSize: '0.8rem', padding: '8px 0' }}>
                        Equipos por definir
                      </div>
                    ) : (
                      <PickRow
                        team1={m.team1 || null} team2={m.team2 || null}
                        myPick={myPick} result90={r90}
                        locked={isLocked} saving={isSaving}
                        onPick={p => handlePick(m.id, p)}
                      />
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
              'Elige 1 (local gana), X (empate) o 2 (visitante gana) en cada partido.',
              'El resultado se basa en los 90 minutos reglamentarios.',
              'Si aciertas el resultado correcto, ganas los puntos de esa ronda.',
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

function PickRow({ team1, team2, myPick, result90, locked, saving, onPick }) {
  const options = [
    { key: '1', team: team1 },
    { key: 'x', team: null },
    { key: '2', team: team2 },
  ];

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(({ key, team }) => {
        const isResult  = result90 === key;
        const isWrong   = result90 && result90 !== key && myPick === key;
        const isCorrect = result90 && result90 === key && myPick === key;
        const isPicked  = myPick === key && !result90;

        let bg     = 'rgba(255,255,255,0.04)';
        let border = 'rgba(255,255,255,0.1)';
        let color  = 'rgba(255,255,255,0.55)';
        let opacity = 1;

        if (isCorrect) { bg = 'rgba(46,204,113,0.2)'; border = '#2ecc71'; color = '#2ecc71'; }
        else if (isResult) { bg = 'rgba(46,204,113,0.1)'; border = 'rgba(46,204,113,0.5)'; color = '#2ecc71'; }
        else if (isWrong)  { bg = 'rgba(200,16,46,0.1)';  border = 'rgba(200,16,46,0.4)';  color = '#ff6b7a'; }
        else if (isPicked) { bg = 'rgba(0,61,165,0.25)';  border = '#5b9cf6'; color = '#fff'; }

        if (result90 && !isResult && !isWrong) opacity = 0.3;

        const isX = key === 'x';
        const iso = team ? TEAM_ISO[team] : null;

        return (
          <button
            key={key}
            onClick={() => !locked && onPick(key)}
            disabled={locked || saving}
            style={{
              flex: key === 'x' ? 0.7 : 1,
              padding: '8px 4px', borderRadius: 8,
              cursor: locked ? 'default' : 'pointer',
              background: bg, border: `1px solid ${border}`,
              textAlign: 'center', transition: 'all 0.18s',
              opacity, minWidth: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}
          >
            {saving && myPick === key ? (
              <span style={{ color, fontSize: '0.85rem' }}>…</span>
            ) : isX ? (
              <span style={{ color, fontFamily: "'Bebas Neue'", fontSize: '0.9rem', letterSpacing: '1px' }}>Empate</span>
            ) : team ? (
              <>
                {iso && (
                  <img
                    src={`https://flagcdn.com/w40/${iso}.png`}
                    alt={team}
                    style={{ width: 26, height: 18, objectFit: 'cover', borderRadius: 2 }}
                  />
                )}
                <span style={{
                  color, fontFamily: "'Barlow Condensed'", fontSize: '0.62rem',
                  letterSpacing: '0.3px', lineHeight: 1.2,
                  maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  padding: '0 2px',
                }}>
                  {team}
                </span>
              </>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'Bebas Neue'", fontSize: '0.9rem' }}>?</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
