import { query } from '@/lib/db';
import { fetchFixtures, TEAM_MAP, FINISHED_STATUSES } from './football-api';
import { matches } from './data';

function buildMatchLookup() {
  const lookup = {};
  for (const m of matches) {
    lookup[`${m.t1}|${m.t2}`] = { matchId: m.id, t1: m.t1, t2: m.t2, reversed: false };
    lookup[`${m.t2}|${m.t1}`] = { matchId: m.id, t1: m.t1, t2: m.t2, reversed: true };
  }
  return lookup;
}

const matchLookup = buildMatchLookup();

export async function ensureColumns() {
  await query(`
    ALTER TABLE match_results
      ADD COLUMN IF NOT EXISTS score_t1 INT,
      ADD COLUMN IF NOT EXISTS score_t2 INT,
      ADD COLUMN IF NOT EXISTS match_status VARCHAR(10),
      ADD COLUMN IF NOT EXISTS api_fixture_id INT
  `);
  await query(`
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
}

export async function runSync(mode = 'today') {
  await ensureColumns();

  let fixtures, requestsUsed, requestsLimit;
  try {
    const result = await fetchFixtures(mode === 'live' ? { live: true } : {});
    fixtures = result.fixtures;
    requestsUsed = result.requestsUsed;
    requestsLimit = result.requestsLimit;
  } catch (err) {
    await query(
      `INSERT INTO api_sync_log (mode, error_message) VALUES ($1, $2)`,
      [mode, err.message]
    );
    throw err;
  }

  let matchesUpdated = 0;
  const notFound = [];

  for (const fix of fixtures) {
    const homeEn = fix.teams?.home?.name;
    const awayEn = fix.teams?.away?.name;
    const homeGoals = fix.goals?.home;
    const awayGoals = fix.goals?.away;
    const status = fix.fixture?.status?.short;
    const elapsed = fix.fixture?.status?.elapsed;
    const fixtureId = fix.fixture?.id;

    if (!homeEn || !awayEn || status === 'NS') continue;

    const homeEs = TEAM_MAP[homeEn];
    const awayEs = TEAM_MAP[awayEn];

    if (!homeEs || !awayEs) {
      notFound.push(`${homeEn} vs ${awayEn}`);
      continue;
    }

    const entry = matchLookup[`${homeEs}|${awayEs}`];
    if (!entry) {
      notFound.push(`${homeEs} vs ${awayEs}`);
      continue;
    }

    const scoreT1 = entry.reversed ? awayGoals : homeGoals;
    const scoreT2 = entry.reversed ? homeGoals : awayGoals;

    const isFinished = FINISHED_STATUSES.includes(status);
    let result = null;
    if (isFinished && scoreT1 !== null && scoreT2 !== null) {
      result = scoreT1 > scoreT2 ? '1' : scoreT1 < scoreT2 ? '2' : 'x';
    }

    const statusWithElapsed = elapsed ? `${status}:${elapsed}` : status;

    await query(`
      INSERT INTO match_results (match_id, result, score_t1, score_t2, match_status, api_fixture_id, entered_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (match_id) DO UPDATE SET
        result        = COALESCE(EXCLUDED.result, match_results.result),
        score_t1      = COALESCE(EXCLUDED.score_t1, match_results.score_t1),
        score_t2      = COALESCE(EXCLUDED.score_t2, match_results.score_t2),
        match_status  = EXCLUDED.match_status,
        api_fixture_id = COALESCE(EXCLUDED.api_fixture_id, match_results.api_fixture_id),
        entered_at    = NOW()
    `, [entry.matchId, result, scoreT1, scoreT2, statusWithElapsed, fixtureId]);

    matchesUpdated++;
  }

  await query(
    `INSERT INTO api_sync_log (mode, matches_updated, requests_used, requests_limit, not_found)
     VALUES ($1, $2, $3, $4, $5)`,
    [mode, matchesUpdated, requestsUsed, requestsLimit, notFound.length ? notFound.join(', ') : null]
  );

  return { ok: true, matchesUpdated, notFound, requestsUsed, requestsLimit };
}
