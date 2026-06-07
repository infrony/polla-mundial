const API_BASE = 'https://v3.football.api-sports.io';

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
};

export const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P'];
export const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

// mode: { date: 'YYYY-MM-DD' } | { live: true }
export async function fetchFixtures({ date, live } = {}) {
  if (!process.env.FOOTBALL_API_KEY) {
    throw new Error('FOOTBALL_API_KEY no configurado en .env.local');
  }

  const params = new URLSearchParams({ league: '1', season: '2026' });
  if (live) params.set('live', 'all');
  else if (date) params.set('date', date);

  const res = await fetch(`${API_BASE}/fixtures?${params}`, {
    headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`);
  }

  return {
    fixtures: data.response || [],
    requestsUsed: data.requests?.current ?? null,
    requestsLimit: data.requests?.limit_day ?? 100,
  };
}
