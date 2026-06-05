import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import KnockoutView from '@/components/KnockoutView';

export const dynamic = 'force-dynamic';

export default async function EliminatoriasPage() {
  const session = await getServerSession(authOptions);

  const [matchesRes, picksRes, resultsRes, userRes] = await Promise.all([
    query(`SELECT id, round, match_number, team1, team2, match_date, locked, picks_open_from FROM knockout_matches ORDER BY
           CASE round WHEN 'r32' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 3 WHEN 'sf' THEN 4 WHEN '3rd' THEN 5 WHEN 'final' THEN 6 END,
           match_number`),
    query(`SELECT match_id, pick FROM knockout_picks WHERE user_id = $1`, [session.user.id]),
    query(`SELECT match_id, winner FROM knockout_results`),
    query(`SELECT paid_knockout FROM users WHERE id = $1`, [session.user.id]),
  ]);

  const paidKnockout = userRes.rows[0]?.paid_knockout ?? false;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 0' }}>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.6rem', letterSpacing: '3px', margin: 0 }}>
          🏆 Fase Eliminatoria
        </h1>
        <span className="badge">2026 World Cup</span>
        <div style={{
          marginLeft: 'auto',
          padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem',
          fontFamily: "'Barlow Condensed'", letterSpacing: '1px', fontWeight: 600,
          background: paidKnockout ? 'rgba(46,204,113,0.12)' : 'rgba(245,166,35,0.12)',
          border: `1px solid ${paidKnockout ? '#2ecc71' : 'rgba(245,166,35,0.5)'}`,
          color: paidKnockout ? '#2ecc71' : '#F5A623',
        }}>
          {paidKnockout ? '✓ Inscrito $10' : '⚠ Inscripción: $10'}
        </div>
      </div>

      {!paidKnockout && (
        <div style={{
          background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          fontFamily: "'Barlow Condensed'", fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.5,
        }}>
          <strong style={{ color: '#F5A623' }}>Inscripción pendiente.</strong> Puedes explorar y guardar tus picks, pero necesitas pagar <strong style={{ color: '#F5A623' }}>$10</strong> para participar oficialmente. Contacta al administrador para confirmar tu pago.
        </div>
      )}

      <div style={{
        background: 'rgba(18,18,31,0.6)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 24,
        display: 'flex', gap: 20, flexWrap: 'wrap',
      }}>
        {[
          { rnd: 'R32', pts: 1 }, { rnd: 'R16', pts: 2 }, { rnd: 'QF', pts: 4 },
          { rnd: 'SF', pts: 6  }, { rnd: '3°/Final', pts: 8 },
        ].map(({ rnd, pts }) => (
          <div key={rnd} style={{ fontFamily: "'Barlow Condensed'", fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ color: '#F5A623', fontWeight: 700 }}>{pts} pt{pts > 1 ? 's' : ''}</span>
            {' '}{rnd}
          </div>
        ))}
      </div>

      <KnockoutView
        initialMatches={matchesRes.rows}
        initialPicks={picksRes.rows}
        initialResults={resultsRes.rows}
        paidKnockout={paidKnockout}
      />
    </div>
  );
}
