'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/partidos',      label: '⚽ Partidos' },
  { href: '/grupos',        label: '🏆 Grupos' },
  { href: '/eliminatorias', label: '🥇 Eliminatorias' },
  { href: '/tabla',         label: '📊 Tabla' },
  { href: '/mis-picks',     label: '⭐ Mis Picks' },
];

export default function AppNav({ isAdmin }) {
  const pathname = usePathname();
  return (
    <nav>
      {tabs.map(t => (
        <Link key={t.href} href={t.href} className={`nav-btn${pathname === t.href ? ' active' : ''}`}>
          {t.label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" className={`nav-btn${pathname === '/admin' ? ' active' : ''}`}>
          🛡️ Admin
        </Link>
      )}
    </nav>
  );
}
