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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS paid_knockout BOOLEAN DEFAULT FALSE;
    `);

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
    await client.query(`
      CREATE TABLE IF NOT EXISTS knockout_matches (
        id           SERIAL PRIMARY KEY,
        round        VARCHAR(10) NOT NULL,
        match_number INT NOT NULL,
        team1        VARCHAR(100),
        team2        VARCHAR(100),
        match_date   VARCHAR(30),
        locked       BOOLEAN DEFAULT FALSE,
        UNIQUE(round, match_number)
      );
      ALTER TABLE knockout_matches ADD COLUMN IF NOT EXISTS match_date VARCHAR(30);
      ALTER TABLE knockout_matches ADD COLUMN IF NOT EXISTS picks_open_from TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS knockout_picks (
        user_id  INT REFERENCES users(id) ON DELETE CASCADE,
        match_id INT REFERENCES knockout_matches(id) ON DELETE CASCADE,
        pick     VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, match_id)
      );

      CREATE TABLE IF NOT EXISTS knockout_results (
        match_id   INT PRIMARY KEY REFERENCES knockout_matches(id) ON DELETE CASCADE,
        winner     VARCHAR(100) NOT NULL,
        entered_by INT REFERENCES users(id),
        entered_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Pre-insert empty bracket slots
    const slots = [
      ...Array.from({length:16}, (_,i) => ['r32',   i+1]),
      ...Array.from({length:8},  (_,i) => ['r16',   i+1]),
      ...Array.from({length:4},  (_,i) => ['qf',    i+1]),
      ...Array.from({length:2},  (_,i) => ['sf',    i+1]),
      ['3rd',   1],
      ['final', 1],
    ];
    for (const [round, num] of slots) {
      await client.query(
        `INSERT INTO knockout_matches (round, match_number) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [round, num]
      );
    }

    // Populate match dates from official 2026 WC bracket
    const dates = [
      ['r32',  1, '28 Jun 2:00 PM'], ['r32',  2, '29 Jun 12:00 PM'], ['r32',  3, '29 Jun 3:30 PM'],
      ['r32',  4, '29 Jun 8:00 PM'], ['r32',  5, '30 Jun 12:00 PM'], ['r32',  6, '30 Jun 4:00 PM'],
      ['r32',  7, '30 Jun 8:00 PM'], ['r32',  8, '1 Jul 11:00 AM'],  ['r32',  9, '1 Jul 3:00 PM'],
      ['r32', 10, '1 Jul 7:00 PM'], ['r32', 11, '2 Jul 2:00 PM'],   ['r32', 12, '2 Jul 6:00 PM'],
      ['r32', 13, '2 Jul 10:00 PM'],['r32', 14, '3 Jul 1:00 PM'],   ['r32', 15, '3 Jul 5:00 PM'],
      ['r32', 16, '3 Jul 8:30 PM'],
      ['r16',  1, '4 Jul 12:00 PM'], ['r16',  2, '4 Jul 4:00 PM'],  ['r16',  3, '5 Jul 3:00 PM'],
      ['r16',  4, '5 Jul 7:00 PM'],  ['r16',  5, '6 Jul 2:00 PM'],  ['r16',  6, '6 Jul 7:00 PM'],
      ['r16',  7, '7 Jul 11:00 AM'], ['r16',  8, '7 Jul 3:00 PM'],
      ['qf',   1, '9 Jul 3:00 PM'],  ['qf',   2, '10 Jul 2:00 PM'], ['qf',   3, '11 Jul 4:00 PM'],
      ['qf',   4, '11 Jul 8:00 PM'],
      ['sf',   1, '14 Jul 2:00 PM'], ['sf',   2, '14 Jul 6:00 PM'],
      ['3rd',  1, '18 Jul 4:00 PM'],
      ['final',1, '19 Jul 2:00 PM'],
    ];
    for (const [round, num, date] of dates) {
      await client.query(
        `UPDATE knockout_matches SET match_date = $1 WHERE round = $2 AND match_number = $3`,
        [date, round, num]
      );
    }

    // picks_open_from: one day before each round's first match (UTC)
    const roundOpens = {
      r32:   '2026-06-27T00:00:00Z',
      r16:   '2026-07-03T00:00:00Z',
      qf:    '2026-07-08T00:00:00Z',
      sf:    '2026-07-13T00:00:00Z',
      '3rd': '2026-07-17T00:00:00Z',
      final: '2026-07-17T00:00:00Z',
    };
    for (const [round, opensAt] of Object.entries(roundOpens)) {
      await client.query(
        `UPDATE knockout_matches SET picks_open_from = $1 WHERE round = $2`,
        [opensAt, round]
      );
    }

    console.log('✅ Tablas creadas correctamente.');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
