import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function posClass(i) {
  if (i === 0) return 'gold-pos';
  if (i === 1) return 'silver-pos';
  if (i === 2) return 'bronze-pos';
  return '';
}
function medal(i) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return i + 1;
}

export default async function TablaPage() {
  const session = await getSession();

  const [groupRes, koRes] = await Promise.all([
    query(`
      SELECT
        u.id, u.name, u.image,
        COUNT(DISTINCT p.match_id) AS total_picks,
        COALESCE(SUM(CASE WHEN p.pick = mr.result THEN 1 ELSE 0 END), 0)
        + COALESCE((
            SELECT SUM(
              CASE WHEN gp2.first_team = gr2.first_team AND gp2.first_team IS NOT NULL THEN 2 ELSE 0 END +
              CASE WHEN gp2.second_team = gr2.second_team AND gp2.second_team IS NOT NULL THEN 1 ELSE 0 END
            )
            FROM group_picks gp2
            LEFT JOIN group_results gr2 ON gr2.group_key = gp2.group_key
            WHERE gp2.user_id = u.id
          ), 0) AS total_pts
      FROM users u
      LEFT JOIN picks p ON p.user_id = u.id
      LEFT JOIN match_results mr ON mr.match_id = p.match_id
      GROUP BY u.id, u.name, u.image
      ORDER BY total_pts DESC, total_picks DESC
    `),
    query(`
      SELECT
        u.id, u.name, u.image,
        COUNT(DISTINCT kp.match_id) AS total_ko_picks,
        COALESCE(SUM(
          CASE WHEN kp.pick = kr.result_90 AND kr.result_90 IS NOT NULL THEN
            CASE km.round
              WHEN 'r32'   THEN 1
              WHEN 'r16'   THEN 2
              WHEN 'qf'    THEN 4
              WHEN 'sf'    THEN 6
              WHEN '3rd'   THEN 8
              WHEN 'final' THEN 8
              ELSE 0
            END
          ELSE 0 END
        ), 0) AS ko_pts
      FROM users u
      LEFT JOIN knockout_picks kp ON kp.user_id = u.id
      LEFT JOIN knockout_matches km ON km.id = kp.match_id
      LEFT JOIN knockout_results kr ON kr.match_id = kp.match_id
      WHERE u.paid_knockout = TRUE
      GROUP BY u.id, u.name, u.image
      ORDER BY ko_pts DESC, total_ko_picks DESC
    `).catch(() => ({ rows: [] })),
  ]);

  const rows     = groupRes.rows;
  const koRows   = koRes.rows;
  const myRank   = rows.findIndex(r => String(r.id) === String(session.user.id)) + 1;
  const myKORank = koRows.findIndex(r => String(r.id) === String(session.user.id)) + 1;
  const isInKO   = myKORank > 0;

  return (
    <>
      {/* ── Knockout standings ── */}
      {koRows.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 4 }}>
            <h2>🏆 Fase Eliminatoria</h2>
            <span className="badge" style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)', color: '#F5A623' }}>
              $10 inscritos
            </span>
            <span className="badge">🔴 EN VIVO</span>
          </div>

          {isInKO && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{koRows.length}</div>
                <div className="stat-label">Inscritos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">#{myKORank}</div>
                <div className="stat-label">Mi Posición KO</div>
              </div>
            </div>
          )}

          <div className="leaderboard-card" style={{ marginBottom: 32 }}>
            {koRows.map((r, i) => {
              const isMe     = String(r.id) === String(session.user.id);
              const initials = r.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={r.id} className={`lb-row${isMe ? ' me' : ''}`}>
                  <div className={`lb-pos ${posClass(i)}`}>{medal(i)}</div>
                  <div className="lb-avatar">
                    {r.image
                      ? <img src={r.image} alt={r.name} />
                      : <span style={{ fontSize: '0.75rem', fontFamily: "'Barlow Condensed'" }}>{initials}</span>
                    }
                  </div>
                  <div className="lb-info">
                    <div className="lb-name">{r.name}{isMe ? ' (Tú)' : ''}</div>
                    <div className="lb-detail">{r.total_ko_picks} picks eliminatoria</div>
                  </div>
                  <div>
                    <div className="lb-score" style={{ color: '#F5A623' }}>{r.ko_pts}</div>
                    <div className="lb-pts">PUNTOS</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 28,
          }} />
        </>
      )}

      {/* ── Group stage standings ── */}
      <div className="section-header">
        <h2>Fase de Grupos</h2>
        <span className="badge">🔴 EN VIVO</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{rows.length}</div>
          <div className="stat-label">Participantes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">#{myRank || '—'}</div>
          <div className="stat-label">Mi Posición</div>
        </div>
      </div>

      <div className="leaderboard-card">
        {rows.map((r, i) => {
          const isMe = String(r.id) === String(session.user.id);
          const initials = r.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={r.id} className={`lb-row${isMe ? ' me' : ''}`}>
              <div className={`lb-pos ${posClass(i)}`}>{medal(i)}</div>
              <div className="lb-avatar">
                {r.image
                  ? <img src={r.image} alt={r.name} />
                  : <span style={{ fontSize: '0.75rem', fontFamily: "'Barlow Condensed'" }}>{initials}</span>
                }
              </div>
              <div className="lb-info">
                <div className="lb-name">{r.name}{isMe ? ' (Tú)' : ''}</div>
                <div className="lb-detail">{r.total_picks} picks realizados</div>
              </div>
              <div>
                <div className="lb-score">{r.total_pts}</div>
                <div className="lb-pts">PUNTOS</div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Barlow Condensed'", letterSpacing: '1px' }}>
            Aún no hay participantes registrados
          </div>
        )}
      </div>
    </>
  );
}
