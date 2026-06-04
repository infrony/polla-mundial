// Load .env.local manually since dotenv may not be installed
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

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        image      TEXT,
        provider   VARCHAR(50) DEFAULT 'credentials',
        is_admin   BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS picks (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        match_id   INTEGER NOT NULL,
        pick       VARCHAR(1) NOT NULL CHECK (pick IN ('1','x','2')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, match_id)
      );

      CREATE TABLE IF NOT EXISTS group_picks (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_key   VARCHAR(1) NOT NULL,
        first_team  VARCHAR(100),
        second_team VARCHAR(100),
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, group_key)
      );

      CREATE TABLE IF NOT EXISTS match_results (
        match_id    INTEGER PRIMARY KEY,
        result      VARCHAR(1) CHECK (result IN ('1','x','2')),
        entered_by  INTEGER REFERENCES users(id),
        entered_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS group_results (
        group_key   VARCHAR(1) PRIMARY KEY,
        first_team  VARCHAR(100),
        second_team VARCHAR(100),
        entered_by  INTEGER REFERENCES users(id),
        entered_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tablas creadas correctamente.');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
