// Migration: add locks_at column to knockout_matches and populate with match start times (UTC)
// Panama is UTC-5 year-round. All times are converted from Panama local to UTC.
// Run: node scripts/migrate-knockout-locks.js

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

// [round, match_number, locks_at_utc]
const LOCKS = [
  ['r32',  1, '2026-06-28T19:00:00Z'],
  ['r32',  2, '2026-06-29T17:00:00Z'],
  ['r32',  3, '2026-06-29T20:30:00Z'],
  ['r32',  4, '2026-06-30T01:00:00Z'],
  ['r32',  5, '2026-06-30T17:00:00Z'],
  ['r32',  6, '2026-06-30T21:00:00Z'],
  ['r32',  7, '2026-07-01T01:00:00Z'],
  ['r32',  8, '2026-07-01T16:00:00Z'],
  ['r32',  9, '2026-07-01T20:00:00Z'],
  ['r32', 10, '2026-07-02T00:00:00Z'],
  ['r32', 11, '2026-07-02T19:00:00Z'],
  ['r32', 12, '2026-07-02T23:00:00Z'],
  ['r32', 13, '2026-07-03T03:00:00Z'],
  ['r32', 14, '2026-07-03T18:00:00Z'],
  ['r32', 15, '2026-07-03T22:00:00Z'],
  ['r32', 16, '2026-07-04T01:30:00Z'],
  ['r16',  1, '2026-07-04T17:00:00Z'],
  ['r16',  2, '2026-07-04T21:00:00Z'],
  ['r16',  3, '2026-07-05T20:00:00Z'],
  ['r16',  4, '2026-07-06T00:00:00Z'],
  ['r16',  5, '2026-07-06T19:00:00Z'],
  ['r16',  6, '2026-07-07T00:00:00Z'],
  ['r16',  7, '2026-07-07T16:00:00Z'],
  ['r16',  8, '2026-07-07T20:00:00Z'],
  ['qf',   1, '2026-07-09T20:00:00Z'],
  ['qf',   2, '2026-07-10T19:00:00Z'],
  ['qf',   3, '2026-07-11T21:00:00Z'],
  ['qf',   4, '2026-07-12T01:00:00Z'],
  ['sf',   1, '2026-07-14T19:00:00Z'],
  ['sf',   2, '2026-07-15T18:00:00Z'],
  ['3rd',  1, '2026-07-18T21:00:00Z'],
  ['final',1, '2026-07-19T19:00:00Z'],
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE knockout_matches ADD COLUMN IF NOT EXISTS locks_at TIMESTAMPTZ
    `);
    console.log('✅ Columna locks_at agregada (o ya existía)');

    for (const [round, num, locksAt] of LOCKS) {
      const res = await client.query(
        `UPDATE knockout_matches SET locks_at = $1 WHERE round = $2 AND match_number = $3`,
        [locksAt, round, num]
      );
      if (res.rowCount) {
        console.log(`  ✓ ${round} #${num} → ${locksAt}`);
      } else {
        console.warn(`  ⚠ ${round} #${num} — no encontrado`);
      }
    }

    console.log('\n✅ Migración completada.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('❌', err.message); process.exit(1); });
