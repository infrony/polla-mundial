// Migration: add score columns to match_results and create api_sync_log
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

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE match_results
        ADD COLUMN IF NOT EXISTS score_t1      INT,
        ADD COLUMN IF NOT EXISTS score_t2      INT,
        ADD COLUMN IF NOT EXISTS match_status  VARCHAR(10),
        ADD COLUMN IF NOT EXISTS api_fixture_id INT
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_sync_log (
        id               SERIAL PRIMARY KEY,
        synced_at        TIMESTAMP DEFAULT NOW(),
        mode             VARCHAR(10),
        matches_updated  INT DEFAULT 0,
        requests_used    INT,
        requests_limit   INT,
        not_found        TEXT,
        error_message    TEXT
      )
    `);
    console.log('✅ Migración de scores completada.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
