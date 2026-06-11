const API_BASE = 'https://worldcup26.ir';

// English API names → Spanish app names
export const TEAM_MAP = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'Korea Republic': 'Corea del Sur',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Rep. Checa',
  'Czechia': 'Rep. Checa',
  'Canada': 'Canadá',
  'Bosnia': 'Bosnia y H.',
  'Bosnia and Herzegovina': 'Bosnia y H.',
  'Qatar': 'Catar',
  'Switzerland': 'Suiza',
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Haiti': 'Haití',
  'Scotland': 'Escocia',
  'United States': 'EEUU',
  'USA': 'EEUU',
  'Paraguay': 'Paraguay',
  'Australia': 'Australia',
  'Turkey': 'Turquía',
  'Turkiye': 'Turquía',
  'Germany': 'Alemania',
  'Curacao': 'Curazao',
  'Ivory Coast': 'C. de Marfil',
  "Cote d'Ivoire": 'C. de Marfil',
  'Ecuador': 'Ecuador',
  'Netherlands': 'Países Bajos',
  'Japan': 'Japón',
  'Sweden': 'Suecia',
  'Tunisia': 'Túnez',
  'Belgium': 'Bélgica',
  'Egypt': 'Egipto',
  'Iran': 'Irán',
  'New Zealand': 'N. Zelanda',
  'Spain': 'España',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'A. Saudita',
  'Uruguay': 'Uruguay',
  'France': 'Francia',
  'Senegal': 'Senegal',
  'Iraq': 'Irak',
  'Norway': 'Noruega',
  'Argentina': 'Argentina',
  'Algeria': 'Argelia',
  'Austria': 'Austria',
  'Jordan': 'Jordania',
  'Portugal': 'Portugal',
  'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo',
  'Democratic Republic of Congo': 'RD Congo',
  'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia',
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Ghana': 'Ghana',
  'Panama': 'Panamá',
  // Additional 2026 World Cup teams
  'Serbia': 'Serbia',
  'Slovenia': 'Eslovenia',
  'Hungary': 'Hungría',
  'Romania': 'Rumanía',
  'Albania': 'Albania',
  'Ukraine': 'Ucrania',
  'Venezuela': 'Venezuela',
  'Bolivia': 'Bolivia',
  'Chile': 'Chile',
  'Peru': 'Perú',
  'Costa Rica': 'Costa Rica',
  'Honduras': 'Honduras',
  'Jamaica': 'Jamaica',
  'Trinidad and Tobago': 'Trinidad y Tobago',
  'Guatemala': 'Guatemala',
  'El Salvador': 'El Salvador',
  'Morocco': 'Marruecos',
  'Nigeria': 'Nigeria',
  'Cameroon': 'Camerún',
  'Mali': 'Malí',
  'Angola': 'Angola',
  'Tanzania': 'Tanzania',
  'Benin': 'Benín',
  'Guinea': 'Guinea',
  'New Caledonia': 'Nueva Caledonia',
  'Indonesia': 'Indonesia',
  'Thailand': 'Tailandia',
  'Qatar': 'Catar',
  'Kuwait': 'Kuwait',
  'Bahrain': 'Baréin',
  'Oman': 'Omán',
  'United Arab Emirates': 'EAU',
  'UAE': 'EAU',
  'China': 'China',
  'India': 'India',
  'Kyrgyzstan': 'Kirguistán',
  'Cuba': 'Cuba',
  'DPR Korea': 'Corea del Norte',
};

export const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
export const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

// In-memory token cache (persists across requests in dev, resets in serverless)
let _cachedToken = null;
let _tokenExpiry = 0;

async function authenticate() {
  const email = process.env.WORLDCUP_API_EMAIL;
  const password = process.env.WORLDCUP_API_PASSWORD;
  if (!email || !password) {
    throw new Error('WORLDCUP_API_EMAIL o WORLDCUP_API_PASSWORD no configurados en .env.local');
  }

  // Return cached token if still valid (84 days - 1h buffer)
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  // Try login
  let res = await fetch(`${API_BASE}/auth/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!res.ok) {
    // Account may not exist yet — register
    res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Polla Mundial App', email, password }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Auth error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const token = data.token || data.accessToken || data.jwt;
  if (!token) throw new Error('Auth: no se recibió token en la respuesta');

  // Cache for 83 days
  _cachedToken = token;
  _tokenExpiry = Date.now() + 83 * 24 * 60 * 60 * 1000;
  return token;
}

async function apiFetch(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function resolveStatus(game) {
  if (game.finished === 'TRUE' || game.finished === true) return 'FT';

  const t = (game.time_elapsed || '').toLowerCase().trim();
  if (!t || t === 'notstarted' || t === 'not started') return 'NS';

  // Known live/in-progress values from this API
  if (t === 'live')                           return '2H';
  if (t === 'ht' || t === 'halftime')         return 'HT';
  if (t === '1h' || t === 'first half')       return '1H';
  if (t === '2h' || t === 'second half')      return '2H';
  if (t === 'et' || t === 'extratime')        return 'ET';
  if (t === 'bt' || t === 'break time')       return 'BT';
  if (t === 'pen' || t === 'penalties')       return 'P';
  if (t === 'ft' || t === 'full time')        return 'FT';
  if (t === 'aet')                            return 'FT';

  // Numeric elapsed minutes
  const mins = Number(t);
  if (!isNaN(mins)) return mins <= 45 ? '1H' : '2H';

  return 'NS';
}

// /get/games is public — no auth required
export async function fetchFixtures({ live } = {}) {
  const res = await fetch(`${API_BASE}/get/games`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);

  const raw = await res.json();
  // API returns { "games": [...] }
  const allGames = Array.isArray(raw) ? raw : (raw.games || raw.data || raw.response || []);

  const fixtures = allGames
    .filter(g => g.home_team_id && g.away_team_id)
    .map(g => {
      const status = resolveStatus(g);
      const started = status !== 'NS';
      // Use team names embedded in each game object (no separate /get/teams call needed)
      return {
        teams: {
          home: { name: g.home_team_name_en || String(g.home_team_id) },
          away: { name: g.away_team_name_en || String(g.away_team_id) },
        },
        goals: {
          home: started ? Number(g.home_score) : null,
          away: started ? Number(g.away_score) : null,
        },
        fixture: {
          id: g.id,
          status: { short: status, elapsed: null },
        },
      };
    });

  const filtered = live
    ? fixtures.filter(f => LIVE_STATUSES.includes(f.fixture.status.short))
    : fixtures.filter(f => f.fixture.status.short !== 'NS');

  return { fixtures: filtered, requestsUsed: null, requestsLimit: null };
}
