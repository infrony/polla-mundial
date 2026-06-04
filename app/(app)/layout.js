import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppNav from '@/components/AppNav';
import LogoutButton from '@/components/LogoutButton';
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
            <svg className="trophy-svg" viewBox="0 0 100 100" fill="none">
              <path d="M50 10 L60 35 H85 L65 55 L72 80 L50 65 L28 80 L35 55 L15 35 H40 Z" fill="#F5A623" opacity="0.9"/>
              <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
              <path d="M30 88 H70" stroke="#F5A623" strokeWidth="3" strokeLinecap="round"/>
              <path d="M50 80 V88" stroke="#F5A623" strokeWidth="3" strokeLinecap="round"/>
            </svg>
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
      <main>{children}</main>
    </>
  );
}
