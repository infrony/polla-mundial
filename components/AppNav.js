'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';

const tabs = [
  { href: '/partidos',      icon: '⚽', label: 'Partidos',      short: 'Partidos' },
  { href: '/grupos',        icon: '🏆', label: 'Grupos',        short: 'Grupos' },
  { href: '/eliminatorias', icon: '🥇', label: 'Eliminatorias', short: 'Elim.' },
  { href: '/tabla',         icon: '📊', label: 'Tabla',         short: 'Tabla' },
  { href: '/mis-picks',     icon: '⭐', label: 'Mis Picks',     short: 'Picks' },
];

export default function AppNav({ isAdmin }) {
  const pathname = usePathname();
  const all = isAdmin ? [...tabs, { href: '/admin', icon: '🛡️', label: 'Admin', short: 'Admin' }] : tabs;

  const navRef  = useRef(null);
  const btnRefs = useRef([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  // Track first render so the pill appears without animation on load
  const firstRender = useRef(true);

  useEffect(() => {
    const activeIdx = all.findIndex(t => t.href === pathname);
    if (activeIdx === -1) return;
    const nav = navRef.current;
    const btn = btnRefs.current[activeIdx];
    if (!nav || !btn) return;

    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setPill({
      left:  btnRect.left - navRect.left,
      width: btnRect.width,
      ready: true,
    });
    firstRender.current = false;
  }, [pathname, all.length]);

  return (
    <nav ref={navRef}>
      {/* Sliding pill — only visible on mobile via CSS */}
      {pill.ready && (
        <span
          className="nav-slider"
          style={{
            left:      pill.left,
            width:     pill.width,
            transition: firstRender.current ? 'none' : 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), width 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      )}

      {all.map((t, i) => (
        <Link
          key={t.href}
          href={t.href}
          ref={el => { btnRefs.current[i] = el; }}
          className={`nav-btn${pathname === t.href ? ' active' : ''}`}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label nav-label-full">{t.label}</span>
          <span className="nav-label nav-label-short">{t.short}</span>
        </Link>
      ))}
    </nav>
  );
}
