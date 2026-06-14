'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  return (
    <nav>
      {all.map(t => (
        <Link key={t.href} href={t.href} className={`nav-btn${pathname === t.href ? ' active' : ''}`}>
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label nav-label-full">{t.label}</span>
          <span className="nav-label nav-label-short">{t.short}</span>
        </Link>
      ))}
    </nav>
  );
}
