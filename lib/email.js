import { matches, groups } from './data';

const MONTHS = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

// Parse a match date string like "14 Jun" / "1 Jul" into a Date (UTC, year 2026)
export function parseMatchDate(dateStr, year = 2026) {
  if (!dateStr) return null;
  const [d, mon] = dateStr.trim().split(/\s+/);
  const month = MONTHS[(mon || '').slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(year, month, parseInt(d, 10)));
}

// Matches kicking off within the next `days` days (from the start of `now`'s day).
export function getUpcomingMatches(now = new Date(), days = 7) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return matches
    .map(m => ({ ...m, _date: parseMatchDate(m.date) }))
    .filter(m => m._date && m._date >= start && m._date <= end)
    .sort((a, b) => a._date - b._date || a.id - b.id);
}

const C = {
  dark: '#0a0e1a', card: '#111626', border: '#222b40',
  gold: '#F5A623', text: '#e8ecf4', muted: '#8b93a7',
  red: '#C8102E', blue: '#003DA5', green: '#2ecc71',
};

function pickLabel(m, pick) {
  if (pick === '1') return `${m.f1} ${m.t1}`;
  if (pick === 'x') return 'Empate';
  if (pick === '2') return `${m.f2} ${m.t2}`;
  return null;
}

/**
 * Build the personalized HTML email for one participant.
 * @param {object} o
 * @param {string} o.name          participant display name
 * @param {number} o.points        total points
 * @param {number} o.rank          1-based position (0/undefined = not ranked)
 * @param {number} o.totalUsers    number of participants
 * @param {number} o.matchPicksCount  how many match picks made
 * @param {Array}  o.groupPicks    [{ group_key, first_team, second_team }]
 * @param {Array}  o.upcoming      upcoming match objects (from getUpcomingMatches)
 * @param {object} o.picksMap      { [matchId]: '1'|'x'|'2' } for this user
 * @param {string} o.appUrl        base app URL for CTA
 */
export function buildEmail({ name, points = 0, rank, totalUsers = 0, matchPicksCount = 0, groupPicks = [], upcoming = [], picksMap = {}, appUrl }) {
  const firstName = (name || 'Participante').split(' ')[0];
  const rankTxt = rank ? `#${rank}${totalUsers ? ` de ${totalUsers}` : ''}` : '—';

  const stat = (val, label) => `
    <td align="center" style="padding:14px 8px;">
      <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:30px;line-height:1;color:${C.gold};font-weight:700;">${val}</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:${C.muted};text-transform:uppercase;margin-top:5px;">${label}</div>
    </td>`;

  const groupRows = groupPicks.length
    ? groupPicks
        .filter(g => g.first_team || g.second_team)
        .map(g => {
          const color = groups[g.group_key]?.color || C.blue;
          return `
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid ${C.border};font-family:Arial,sans-serif;font-size:14px;color:${C.text};">
              <span style="display:inline-block;min-width:64px;font-weight:700;color:${color};">Grupo ${g.group_key}</span>
              <span style="color:${C.muted};">1°</span> ${g.first_team || '—'}
              <span style="color:${C.muted};margin-left:8px;">2°</span> ${g.second_team || '—'}
            </td>
          </tr>`;
        })
        .join('')
    : `<tr><td style="padding:8px 0;font-family:Arial,sans-serif;font-size:14px;color:${C.muted};">Aún no has hecho tu pronóstico de grupos.</td></tr>`;

  const upcomingRows = upcoming.length
    ? upcoming
        .map(m => {
          const myPick = pickLabel(m, picksMap[m.id]);
          const pickHtml = myPick
            ? `<span style="color:${C.green};font-weight:700;">${myPick}</span>`
            : `<span style="color:${C.red};">⚠ Aún sin pronóstico</span>`;
          return `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-family:Arial,sans-serif;">
              <div style="font-size:11px;letter-spacing:1px;color:${C.muted};text-transform:uppercase;">${m.date} · Grupo ${m.group} · J${m.jornada}</div>
              <div style="font-size:15px;color:${C.text};margin-top:3px;">${m.f1} ${m.t1} <span style="color:${C.muted};">vs</span> ${m.t2} ${m.f2}</div>
              <div style="font-size:13px;margin-top:3px;color:${C.muted};">Tu pronóstico: ${pickHtml}</div>
            </td>
          </tr>`;
        })
        .join('')
    : `<tr><td style="padding:8px 0;font-family:Arial,sans-serif;font-size:14px;color:${C.muted};">No hay partidos programados para los próximos días.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Polla Mundial 2026</title></head>
<body style="margin:0;padding:0;background:${C.dark};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.dark};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${C.blue},${C.dark});padding:28px 28px 22px;border-bottom:3px solid ${C.gold};">
          <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:28px;letter-spacing:3px;color:#fff;font-weight:700;">POLLA MUNDIAL 2026</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;margin-top:4px;">Resumen semanal de tu polla</div>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:26px 28px 6px;">
          <div style="font-family:Arial,sans-serif;font-size:20px;color:${C.text};font-weight:700;">Hola ${firstName} 👋</div>
          <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:${C.muted};margin:10px 0 0;">
            Aquí está el resumen de tus pronósticos y los partidos que se vienen esta semana. ¡Asegúrate de tener todos tus pronósticos listos antes de cada partido!
          </p>
        </td></tr>

        <!-- Stats -->
        <tr><td style="padding:18px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.dark};border:1px solid ${C.border};border-radius:10px;">
            <tr>
              ${stat(points, 'Puntos')}
              ${stat(rankTxt, 'Posición')}
              ${stat(matchPicksCount, 'Picks')}
            </tr>
          </table>
        </td></tr>

        <!-- Group picks -->
        <tr><td style="padding:10px 28px 6px;">
          <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:18px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;border-bottom:1px solid ${C.border};padding-bottom:6px;">🏆 Tu pronóstico de grupos</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${groupRows}</table>
        </td></tr>

        <!-- Upcoming -->
        <tr><td style="padding:18px 28px 6px;">
          <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:18px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;border-bottom:1px solid ${C.border};padding-bottom:6px;">⚽ Partidos de la próxima semana</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${upcomingRows}</table>
        </td></tr>

        <!-- CTA -->
        <tr><td align="center" style="padding:26px 28px 30px;">
          <a href="${appUrl}" style="display:inline-block;background:${C.gold};color:${C.dark};font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;font-size:16px;letter-spacing:1px;text-decoration:none;padding:13px 34px;border-radius:8px;">ENTRAR A LA POLLA →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:18px 28px;background:${C.dark};border-top:1px solid ${C.border};">
          <p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${C.muted};margin:0;text-align:center;">
            Polla Mundial 2026 · Te llega este correo porque participas en la polla.<br>
            Puntuación: 1 pt por resultado acertado · 2 pts por 1° de grupo · 1 pt por 2° de grupo.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const EMAIL_SUBJECT = '⚽ Tu resumen semanal · Polla Mundial 2026';

// Knockout rounds: points per correct pick, the date the phase begins (startsAt,
// first match — emails can only be sent once it has passed) and the date the phase
// is considered finished (endsAt, a few hours after the last match — used to trigger
// the automatic recap email).
export const KNOCKOUT_ROUNDS = [
  { key: 'r32',   label: 'Dieciseisavos de Final', pts: 1, startsAt: '2026-06-28T00:00:00Z', endsAt: '2026-07-04T08:00:00Z' },
  { key: 'r16',   label: 'Octavos de Final',        pts: 2, startsAt: '2026-07-04T00:00:00Z', endsAt: '2026-07-08T08:00:00Z' },
  { key: 'qf',    label: 'Cuartos de Final',         pts: 4, startsAt: '2026-07-09T00:00:00Z', endsAt: '2026-07-12T08:00:00Z' },
  { key: 'sf',    label: 'Semifinal',                pts: 6, startsAt: '2026-07-14T00:00:00Z', endsAt: '2026-07-15T08:00:00Z' },
  { key: '3rd',   label: 'Tercer Lugar',             pts: 8, startsAt: '2026-07-18T00:00:00Z', endsAt: '2026-07-19T08:00:00Z' },
  { key: 'final', label: 'Gran Final',               pts: 8, startsAt: '2026-07-19T00:00:00Z', endsAt: '2026-07-20T08:00:00Z' },
];

export function knockoutRound(key) {
  return KNOCKOUT_ROUNDS.find(r => r.key === key);
}

export function knockoutSubject(roundLabel) {
  return `🏆 Resumen de ${roundLabel} · Polla Mundial 2026`;
}

/**
 * Build the personalized knockout-phase recap email for one participant.
 * @param {object} o
 * @param {string} o.name
 * @param {string} o.roundLabel       e.g. "Octavos de Final"
 * @param {number} o.roundPts         points per correct pick this round
 * @param {Array}  o.roundMatches     [{ id, match_number, team1, team2, match_date }]
 * @param {object} o.picksMap         { [matchId]: pickedTeam } for this user
 * @param {object} o.results          { [matchId]: winnerTeam }
 * @param {number} o.roundPoints      points earned by this user in this round
 * @param {number} o.totalKoPoints    total knockout points for this user
 * @param {number} o.rank             1-based position among knockout participants
 * @param {number} o.totalParticipants
 * @param {Array}  o.nextMatches      next round matches for preview (optional)
 * @param {string} o.nextLabel        next round label (optional)
 * @param {string} o.appUrl
 */
export function buildKnockoutEmail({ name, roundLabel, roundPts = 0, roundMatches = [], picksMap = {}, results = {}, roundPoints = 0, totalKoPoints = 0, rank, totalParticipants = 0, nextMatches = [], nextLabel, appUrl }) {
  const firstName = (name || 'Participante').split(' ')[0];
  const rankTxt = rank ? `#${rank}${totalParticipants ? ` de ${totalParticipants}` : ''}` : '—';

  const stat = (val, label) => `
    <td align="center" style="padding:14px 8px;">
      <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:30px;line-height:1;color:${C.gold};font-weight:700;">${val}</div>
      <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:${C.muted};text-transform:uppercase;margin-top:5px;">${label}</div>
    </td>`;

  const matchRows = roundMatches.length
    ? roundMatches
        .map(m => {
          const winner = results[m.id];
          const pick = picksMap[m.id];
          let pickHtml;
          if (!pick) {
            pickHtml = `<span style="color:${C.red};">⚠ Sin pronóstico</span>`;
          } else if (!winner) {
            pickHtml = `<span style="color:${C.gold};">${pick}</span>`;
          } else if (pick === winner) {
            pickHtml = `<span style="color:${C.green};font-weight:700;">✓ ${pick}</span>`;
          } else {
            pickHtml = `<span style="color:${C.red};">✗ ${pick}</span>`;
          }
          const teams = (m.team1 || m.team2) ? `${m.team1 || '?'} <span style="color:${C.muted};">vs</span> ${m.team2 || '?'}` : 'Por definir';
          const winHtml = winner ? `<span style="color:${C.muted};"> · Ganó:</span> <span style="color:${C.text};font-weight:700;">${winner}</span>` : '';
          return `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-family:Arial,sans-serif;">
              <div style="font-size:11px;letter-spacing:1px;color:${C.muted};text-transform:uppercase;">#${m.match_number}${m.match_date ? ` · ${m.match_date}` : ''}</div>
              <div style="font-size:15px;color:${C.text};margin-top:3px;">${teams}${winHtml}</div>
              <div style="font-size:13px;margin-top:3px;color:${C.muted};">Tu pronóstico: ${pickHtml}</div>
            </td>
          </tr>`;
        })
        .join('')
    : `<tr><td style="padding:8px 0;font-family:Arial,sans-serif;font-size:14px;color:${C.muted};">No hay partidos en esta fase todavía.</td></tr>`;

  const nextSection = nextMatches.length
    ? `
      <tr><td style="padding:18px 28px 6px;">
        <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:18px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;border-bottom:1px solid ${C.border};padding-bottom:6px;">🔜 Lo que viene: ${nextLabel || ''}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${nextMatches.map(m => `
          <tr><td style="padding:8px 0;border-bottom:1px solid ${C.border};font-family:Arial,sans-serif;font-size:14px;color:${C.text};">
            <span style="color:${C.muted};font-size:11px;letter-spacing:1px;">#${m.match_number}${m.match_date ? ` · ${m.match_date}` : ''}</span><br>
            ${(m.team1 || m.team2) ? `${m.team1 || '?'} <span style="color:${C.muted};">vs</span> ${m.team2 || '?'}` : 'Por definir'}
          </td></tr>`).join('')}
        </table>
        <p style="font-family:Arial,sans-serif;font-size:13px;color:${C.muted};margin:10px 0 0;">¡No olvides hacer tus pronósticos antes de que inicie la siguiente fase!</p>
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Polla Mundial 2026 · Eliminatorias</title></head>
<body style="margin:0;padding:0;background:${C.dark};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.dark};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,${C.blue},${C.dark});padding:28px 28px 22px;border-bottom:3px solid ${C.gold};">
          <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:28px;letter-spacing:3px;color:#fff;font-weight:700;">POLLA MUNDIAL 2026</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;margin-top:4px;">Resumen de ${roundLabel}</div>
        </td></tr>

        <tr><td style="padding:26px 28px 6px;">
          <div style="font-family:Arial,sans-serif;font-size:20px;color:${C.text};font-weight:700;">Hola ${firstName} 👋</div>
          <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:${C.muted};margin:10px 0 0;">
            Terminó la fase de <strong style="color:${C.text};">${roundLabel}</strong>. Aquí está cómo te fue en tus pronósticos de eliminatorias. Cada acierto en esta fase vale ${roundPts} ${roundPts === 1 ? 'punto' : 'puntos'}.
          </p>
        </td></tr>

        <tr><td style="padding:18px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.dark};border:1px solid ${C.border};border-radius:10px;">
            <tr>
              ${stat(`+${roundPoints}`, 'Esta fase')}
              ${stat(totalKoPoints, 'Total eliminatorias')}
              ${stat(rankTxt, 'Posición')}
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:10px 28px 6px;">
          <div style="font-family:'Bebas Neue',Arial,sans-serif;font-size:18px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;border-bottom:1px solid ${C.border};padding-bottom:6px;">🥇 Tus pronósticos · ${roundLabel}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${matchRows}</table>
        </td></tr>

        ${nextSection}

        <tr><td align="center" style="padding:26px 28px 30px;">
          <a href="${appUrl}" style="display:inline-block;background:${C.gold};color:${C.dark};font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;font-size:16px;letter-spacing:1px;text-decoration:none;padding:13px 34px;border-radius:8px;">VER LAS ELIMINATORIAS →</a>
        </td></tr>

        <tr><td style="padding:18px 28px;background:${C.dark};border-top:1px solid ${C.border};">
          <p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${C.muted};margin:0;text-align:center;">
            Polla Mundial 2026 · Te llega este correo porque participas en las eliminatorias.<br>
            Puntos por acierto: Dieciseisavos 1 · Octavos 2 · Cuartos 4 · Semifinal 6 · 3er Lugar y Final 8.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
