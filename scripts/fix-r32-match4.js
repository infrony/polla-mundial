// Fix: r32 match #4 was incorrectly set to Bélgica/Senegal — correct to Países Bajos/Marruecos
const fs = require('fs');
const path = require('path');
try {
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#') && v.length) process.env[k.trim()] = v.join('=').replace(/^"|"$/g, '').trim();
  });
} catch {}
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  const client = await pool.connect();
  try {
    // Show current state
    const before = await client.query(
      `SELECT match_number, match_date, team1, team2 FROM knockout_matches WHERE round = 'r32' ORDER BY match_number`
    );
    console.log('Estado actual:');
    before.rows.forEach(r => console.log(`  #${r.match_number} ${r.match_date} | ${r.team1 || '?'} vs ${r.team2 || '?'}`));

    // Fix match #4
    const res = await client.query(
      `UPDATE knockout_matches SET team1 = 'Países Bajos', team2 = 'Marruecos' WHERE round = 'r32' AND match_number = 4`
    );
    console.log(`\n✅ Match #4 actualizado (${res.rowCount} fila)`);

    // Verify
    const after = await client.query(
      `SELECT match_number, team1, team2 FROM knockout_matches WHERE round = 'r32' AND match_number = 4`
    );
    console.log('Ahora:', after.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(err => { console.error('Error:', err.message); process.exit(1); });
