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
