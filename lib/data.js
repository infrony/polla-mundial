// lockDate: fecha/hora UTC en que se bloquean los picks del grupo (inicio del primer partido)
export const groups = {
  A: { teams: ['México','Sudáfrica','Corea del Sur','Rep. Checa'], flag: ['🇲🇽','🇿🇦','🇰🇷','🇨🇿'], iso: ['mx','za','kr','cz'], color: '#e8b500', lockDate: '2026-06-11T12:00:00Z' },
  B: { teams: ['Canadá','Bosnia y H.','Catar','Suiza'], flag: ['🇨🇦','🇧🇦','🇶🇦','🇨🇭'], iso: ['ca','ba','qa','ch'], color: '#2ecc71', lockDate: '2026-06-11T18:00:00Z' },
  C: { teams: ['Brasil','Marruecos','Haití','Escocia'], flag: ['🇧🇷','🇲🇦','🇭🇹','🏴󠁧󠁢󠁳󠁣󠁴󠁿'], iso: ['br','ma','ht','gb-sct'], color: '#3498db', lockDate: '2026-06-12T12:00:00Z' },
  D: { teams: ['EEUU','Paraguay','Australia','Turquía'], flag: ['🇺🇸','🇵🇾','🇦🇺','🇹🇷'], iso: ['us','py','au','tr'], color: '#9b59b6', lockDate: '2026-06-12T18:00:00Z' },
  E: { teams: ['Alemania','Curazao','C. de Marfil','Ecuador'], flag: ['🇩🇪','🇨🇼','🇨🇮','🇪🇨'], iso: ['de','cw','ci','ec'], color: '#e74c3c', lockDate: '2026-06-13T12:00:00Z' },
  F: { teams: ['Países Bajos','Japón','Suecia','Túnez'], flag: ['🇳🇱','🇯🇵','🇸🇪','🇹🇳'], iso: ['nl','jp','se','tn'], color: '#e67e22', lockDate: '2026-06-13T18:00:00Z' },
  G: { teams: ['Bélgica','Egipto','Irán','N. Zelanda'], flag: ['🇧🇪','🇪🇬','🇮🇷','🇳🇿'], iso: ['be','eg','ir','nz'], color: '#1abc9c', lockDate: '2026-06-14T12:00:00Z' },
  H: { teams: ['España','Cabo Verde','A. Saudita','Uruguay'], flag: ['🇪🇸','🇨🇻','🇸🇦','🇺🇾'], iso: ['es','cv','sa','uy'], color: '#c0392b', lockDate: '2026-06-14T18:00:00Z' },
  I: { teams: ['Francia','Senegal','Irak','Noruega'], flag: ['🇫🇷','🇸🇳','🇮🇶','🇳🇴'], iso: ['fr','sn','iq','no'], color: '#2980b9', lockDate: '2026-06-15T12:00:00Z' },
  J: { teams: ['Argentina','Argelia','Austria','Jordania'], flag: ['🇦🇷','🇩🇿','🇦🇹','🇯🇴'], iso: ['ar','dz','at','jo'], color: '#16a085', lockDate: '2026-06-15T18:00:00Z' },
  K: { teams: ['Portugal','RD Congo','Uzbekistán','Colombia'], flag: ['🇵🇹','🇨🇩','🇺🇿','🇨🇴'], iso: ['pt','cd','uz','co'], color: '#8e44ad', lockDate: '2026-06-16T12:00:00Z' },
  L: { teams: ['Inglaterra','Croacia','Ghana','Panamá'], flag: ['🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇭🇷','🇬🇭','🇵🇦'], iso: ['gb-eng','hr','gh','pa'], color: '#d35400', lockDate: '2026-06-16T18:00:00Z' },
};

// Dates [jornada1, jornada2, jornada3] per group pair
const groupDates = {
  A: ['11 Jun','19 Jun','26 Jun'], B: ['11 Jun','19 Jun','26 Jun'],
  C: ['12 Jun','20 Jun','27 Jun'], D: ['12 Jun','20 Jun','27 Jun'],
  E: ['13 Jun','21 Jun','28 Jun'], F: ['13 Jun','21 Jun','28 Jun'],
  G: ['14 Jun','22 Jun','29 Jun'], H: ['14 Jun','22 Jun','29 Jun'],
  I: ['15 Jun','23 Jun','30 Jun'], J: ['15 Jun','23 Jun','30 Jun'],
  K: ['16 Jun','24 Jun','1 Jul'],  L: ['16 Jun','24 Jun','1 Jul'],
};

// Generate 72 matches: 6 per group, pairings [T0vT1, T2vT3, T0vT2, T1vT3, T0vT3, T1vT2]
function generateMatches() {
  const pairings = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  const all = [];
  let id = 1;
  for (const [gKey, g] of Object.entries(groups)) {
    const dates = groupDates[gKey];
    pairings.forEach(([i, j], matchIdx) => {
      const jornada = Math.floor(matchIdx / 2) + 1;
      all.push({
        id,
        group: gKey,
        jornada,
        date: dates[jornada - 1],
        t1: g.teams[i], f1: g.flag[i], iso1: g.iso[i],
        t2: g.teams[j], f2: g.flag[j], iso2: g.iso[j],
      });
      id++;
    });
  }
  return all;
}

export const matches = generateMatches();

export function getGroupColor(groupKey) {
  return groups[groupKey]?.color ?? '#003DA5';
}
