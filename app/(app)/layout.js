import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppNav from '@/components/AppNav';
import LogoutButton from '@/components/LogoutButton';
import Countdown from '@/components/Countdown';
import { query } from '@/lib/db';

export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Fetch real-time points for header
  let pts = 0;
  try {
    const res = await query(
      `SELECT COUNT(*) as cnt FROM picks p
       JOIN match_results mr ON mr.match_id = p.match_id AND mr.result = p.pick
       WHERE p.user_id = $1`,
      [session.user.id]
    );
    pts = parseInt(res.rows[0]?.cnt ?? 0);
  } catch {}

  return (
    <>
      <div className="world-strip" />
      <header>
        <div className="header-inner">
          <div className="logo-block">
            <img src="/logo.png" alt="FIFA World Cup 2026" style={{ width: 42, height: 42 }} />
            <div>
              <div className="header-title">Polla Mundial</div>
              <div className="header-subtitle">EEUU · México · Canadá 2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="score-pill">
              <span>PTS</span>
              <span>{pts}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <AppNav isAdmin={session.user.isAdmin} />
      <main style={{ paddingBottom: '64px' }}>{children}</main>
      <Countdown variant="floating" />
      <footer style={{
        textAlign: 'center',
        padding: '14px 16px 72px',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '0.75rem',
        letterSpacing: '1px',
        color: 'rgba(255,255,255,0.25)',
      }}>
        Hecho con ❤️ en Panamá 🇵🇦 por{' '}
        <a href="https://infrony.com" target="_blank" rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
          infrony.com
        </a>
      </footer>
    </>
  );
}
