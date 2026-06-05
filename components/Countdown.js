'use client';
import { useState, useEffect, useRef } from 'react';

const WORLD_CUP_START = new Date('2026-06-11T17:00:00Z');
const HIDE_AFTER      = new Date(WORLD_CUP_START.getTime() + 24 * 60 * 60 * 1000);

function getTimeLeft() {
  const diff = WORLD_CUP_START - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000)  / 60000),
    seconds: Math.floor((diff % 60000)    / 1000),
  };
}

/* ── Tarjeta individual con efecto flip vertical ─────────────────── */
function FlipUnit({ value, label, color, size = 'lg' }) {
  const padded    = String(value).padStart(2, '0');
  const prevRef   = useRef(padded);
  const [cur, setCur]   = useState(padded);
  const [prev, setPrev] = useState(padded);
  const [flip, setFlip] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (padded !== cur) {
      setPrev(cur);
      setCur(padded);
      setFlip(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlip(false), 420);
    }
  }, [padded]);

  const isLg = size === 'lg';
  const W  = isLg ? 84 : 48;
  const H  = isLg ? 100 : 58;
  const FS = isLg ? '4rem' : '2rem';
  const cardStyle = {
    position: 'absolute', inset: 0,
    borderRadius: 10,
    background: 'rgba(8,8,20,0.88)',
    border: `1px solid ${color}44`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: FS, color: '#fff', overflow: 'hidden',
    userSelect: 'none',
  };
  const midLine = (
    <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:`${color}35` }} />
  );

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: W, height: H, perspective: 600 }}>
        {/* Base card — always shows new value */}
        <div style={{ ...cardStyle, boxShadow: `0 0 18px ${color}22` }}>
          {cur}{midLine}
        </div>

        {/* Flip card — shows old value, rotates away top→bottom */}
        {flip && (
          <div style={{
            ...cardStyle,
            zIndex: 3,
            transformOrigin: '50% 100%',
            animation: 'cdFlipOut 0.42s cubic-bezier(0.4,0,0.8,0.6) forwards',
          }}>
            {prev}{midLine}
          </div>
        )}

        {/* New value rising from below */}
        {flip && (
          <div style={{
            ...cardStyle,
            zIndex: 2,
            transformOrigin: '50% 0%',
            animation: 'cdFlipIn 0.42s cubic-bezier(0.2,0.6,0.4,1) forwards',
          }}>
            {cur}{midLine}
          </div>
        )}

        {/* Corner glow */}
        <div style={{ position:'absolute', inset:-1, borderRadius:11, boxShadow:`0 0 20px ${color}25`, pointerEvents:'none' }} />
      </div>

      <div style={{
        marginTop: isLg ? 10 : 6,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize:  isLg ? '0.72rem' : '0.58rem',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        color, opacity: 0.85,
      }}>
        {label}
      </div>
    </div>
  );
}

function Colon({ size = 'lg' }) {
  return (
    <div style={{
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: size === 'lg' ? '3.2rem' : '1.6rem',
      color: 'rgba(255,255,255,0.18)',
      marginTop: size === 'lg' ? 6 : 2,
      lineHeight: 1,
      userSelect: 'none',
    }}>:</div>
  );
}

/* ── Componente principal ────────────────────────────────────────── */
export default function Countdown({ variant = 'login' }) {
  const [time,    setTime]    = useState(null);
  const [hidden,  setHidden]  = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (Date.now() > HIDE_AFTER) { setHidden(true); return; }
    setTime(getTimeLeft());
    const id = setInterval(() => {
      if (Date.now() > HIDE_AFTER) { setHidden(true); clearInterval(id); return; }
      setTime(getTimeLeft());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted || hidden) return null;

  const started = !time;

  /* ── Versión flotante (app pages) ── */
  if (variant === 'floating') {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'linear-gradient(90deg,rgba(0,61,165,0.97) 0%,rgba(8,8,20,0.97) 50%,rgba(200,16,46,0.97) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: '7px 16px', flexWrap: 'wrap',
      }}>
        {started ? (
          <span style={{ fontFamily:"'Bebas Neue'", fontSize:'1.1rem', letterSpacing:'3px', color:'#F5A623' }}>
            ⚽ ¡EL MUNDIAL HA COMENZADO!
          </span>
        ) : (
          <>
            <span style={{ fontFamily:"'Barlow Condensed'", fontSize:'0.65rem', letterSpacing:'2px', color:'rgba(255,255,255,0.45)', textTransform:'uppercase' }}>
              Inicia en
            </span>
            {[
              { v: time.days,    l: 'Días',  c: '#F5A623' },
              { v: time.hours,   l: 'Horas', c: '#C8102E' },
              { v: time.minutes, l: 'Min',   c: '#FAFAFA' },
              { v: time.seconds, l: 'Seg',   c: '#5b9cf6' },
            ].map(({ v, l, c }) => (
              <FlipUnit key={l} value={v} label={l} color={c} size="sm" />
            ))}
          </>
        )}
      </div>
    );
  }

  /* ── Versión login (grande) ── */
  return (
    <div style={{ marginTop: 28, textAlign: 'center' }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '0.95rem', letterSpacing: '4px',
        color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
        marginBottom: 18,
      }}>
        ⚽ Cuenta regresiva al Mundial
      </div>

      {started ? (
        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: '1.7rem', letterSpacing: '3px',
          color: '#F5A623', padding: '16px 20px',
          border: '1px solid rgba(245,166,35,0.3)', borderRadius: 12,
          background: 'rgba(245,166,35,0.06)',
        }}>
          ⚽ ¡EL MUNDIAL HA COMENZADO!
        </div>
      ) : (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-start', gap: 10 }}>
          <FlipUnit value={time.days}    label="Días"  color="#F5A623" />
          <Colon />
          <FlipUnit value={time.hours}   label="Horas" color="#C8102E" />
          <Colon />
          <FlipUnit value={time.minutes} label="Min"   color="#FAFAFA" />
          <Colon />
          <FlipUnit value={time.seconds} label="Seg"   color="#5b9cf6" />
        </div>
      )}
    </div>
  );
}
