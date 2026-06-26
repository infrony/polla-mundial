import { revalidateTag } from 'next/cache';
import { query } from '@/lib/db';
import { fetchFixtures, fetchAllGamesRaw, resolveTeam, FINISHED_STATUSES } from './football-api';
import { matches, groups } from './data';

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
    ALTER TABLE knockout_results
      ADD COLUMN IF NOT EXISTS result_90 VARCHAR(1)
  `);
  await query(`ALTER TABLE knockout_results ALTER COLUMN winner DROP NOT NULL`);
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

    const homeEs = resolveTeam(homeEn);
    const awayEs = resolveTeam(awayEn);

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

  await Promise.all([
    query(
      `INSERT INTO api_sync_log (mode, matches_updated, requests_used, requests_limit, not_found)
       VALUES ($1, $2, $3, $4, $5)`,
      [mode, matchesUpdated, requestsUsed, requestsLimit, notFound.length ? notFound.join(', ') : null]
    ),
    // Keep only logs from the last hour to avoid unbounded table growth
    query(`DELETE FROM api_sync_log WHERE synced_at < NOW() - INTERVAL '1 hour'`),
  ]);

  const groupsAutoUpdated = await syncGroupResults();
  const knockoutAutoUpdated = await syncKnockoutBracket();

  return { ok: true, matchesUpdated, notFound, requestsUsed, requestsLimit, groupsAutoUpdated, knockoutAutoUpdated };
}

// Build a lookup: group key → array of match objects
const matchesByGroup = {};
for (const m of matches) {
  if (!matchesByGroup[m.group]) matchesByGroup[m.group] = [];
  matchesByGroup[m.group].push(m);
}

export async function syncGroupResults() {
  // Get all match results that have scores
  const resultsRes = await query(
    `SELECT match_id, result, score_t1, score_t2 FROM match_results WHERE result IS NOT NULL`
  );
  const resultMap = {};
  for (const r of resultsRes.rows) {
    resultMap[r.match_id] = r;
  }

  const groupsUpdated = [];

  for (const [groupKey, groupMatches] of Object.entries(matchesByGroup)) {
    // All 6 matches must have a result (scores optional — used for tiebreakers when available)
    const allFinished = groupMatches.every(m => {
      const r = resultMap[m.id];
      return r && r.result;
    });
    if (!allFinished) continue;

    // Compute standings from DB results/scores
    const stats = {};
    for (const team of groups[groupKey].teams) {
      stats[team] = { pts: 0, gf: 0, ga: 0 };
    }
    for (const m of groupMatches) {
      const r = resultMap[m.id];
      const s1 = r.score_t1 !== null ? Number(r.score_t1) : 0;
      const s2 = r.score_t2 !== null ? Number(r.score_t2) : 0;
      stats[m.t1].gf += s1; stats[m.t1].ga += s2;
      stats[m.t2].gf += s2; stats[m.t2].ga += s1;
      if (r.result === '1')      { stats[m.t1].pts += 3; }
      else if (r.result === '2') { stats[m.t2].pts += 3; }
      else                       { stats[m.t1].pts += 1; stats[m.t2].pts += 1; }
    }

    const sorted = Object.entries(stats)
      .map(([name, s]) => ({ name, ...s, gd: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));

    const first = sorted[0].name;
    const second = sorted[1].name;

    await query(
      `INSERT INTO group_results (group_key, first_team, second_team, entered_by, entered_at)
       VALUES ($1, $2, $3, NULL, NOW())
       ON CONFLICT (group_key) DO UPDATE
         SET first_team = EXCLUDED.first_team,
             second_team = EXCLUDED.second_team,
             entered_by = NULL,
             entered_at = NOW()`,
      [groupKey, first, second]
    );

    groupsUpdated.push(groupKey);
  }

  if (groupsUpdated.length > 0) {
    revalidateTag('group-results');
  }

  return groupsUpdated;
}

// ── Knockout bracket auto-sync ──────────────────────────────────────────────

// Determines the knockout round from the local game date string "YYYY-MM-DD HH:MM:SS"
function getKnockoutRound(localDate) {
  const dateOnly = (localDate || '').split(' ')[0];
  if (!dateOnly) return null;
  const [y, mo, day] = dateOnly.split('-').map(Number);
  if (y !== 2026) return null;
  if (mo === 6 && day >= 28) return 'r32';
  if (mo === 7 && day <= 3)  return 'r32';
  if (mo === 7 && day >= 4 && day <= 7)  return 'r16';
  if (mo === 7 && day >= 9 && day <= 11) return 'qf';
  if (mo === 7 && day >= 14 && day <= 15) return 'sf';
  if (mo === 7 && day === 18) return '3rd';
  if (mo === 7 && day >= 19) return 'final';
  return null;
}

// Standard bracket: winner of match N in round → next round slot
// Pairs are adjacent: (1,2)→next#1, (3,4)→next#2, etc.
const BRACKET_NEXT = {
  r32: { 1:{r:'r16',m:1,s:1}, 2:{r:'r16',m:1,s:2}, 3:{r:'r16',m:2,s:1},  4:{r:'r16',m:2,s:2},
         5:{r:'r16',m:3,s:1}, 6:{r:'r16',m:3,s:2}, 7:{r:'r16',m:4,s:1},  8:{r:'r16',m:4,s:2},
         9:{r:'r16',m:5,s:1},10:{r:'r16',m:5,s:2},11:{r:'r16',m:6,s:1}, 12:{r:'r16',m:6,s:2},
        13:{r:'r16',m:7,s:1},14:{r:'r16',m:7,s:2},15:{r:'r16',m:8,s:1}, 16:{r:'r16',m:8,s:2} },
  r16: { 1:{r:'qf',m:1,s:1}, 2:{r:'qf',m:1,s:2}, 3:{r:'qf',m:2,s:1}, 4:{r:'qf',m:2,s:2},
         5:{r:'qf',m:3,s:1}, 6:{r:'qf',m:3,s:2}, 7:{r:'qf',m:4,s:1}, 8:{r:'qf',m:4,s:2} },
  qf:  { 1:{r:'sf',m:1,s:1}, 2:{r:'sf',m:1,s:2}, 3:{r:'sf',m:2,s:1}, 4:{r:'sf',m:2,s:2} },
  sf:  { 1:{r:'final',m:1,s:1}, 2:{r:'final',m:1,s:2} },
};
// SF losers go to 3rd-place match
const SF_LOSER_NEXT = { 1:{r:'3rd',m:1,s:1}, 2:{r:'3rd',m:1,s:2} };

export async function syncKnockoutBracket() {
  // Fetch all games from API
  let allGames;
  try {
    allGames = await fetchAllGamesRaw();
  } catch {
    return [];
  }

  // Filter to knockout games only: not in group-stage matchLookup + has a knockout round date
  const koGames = allGames
    .filter(g => {
      if (!g.homeEs || !g.awayEs) return false;
      if (matchLookup[`${g.homeEs}|${g.awayEs}`]) return false; // group stage game
      return getKnockoutRound(g.localDate) !== null;
    })
    .map(g => ({ ...g, round: getKnockoutRound(g.localDate) }))
    .sort((a, b) => a.localDate.localeCompare(b.localDate));

  if (koGames.length === 0) return [];

  // Load all knockout_matches from DB
  const dbRes = await query(`
    SELECT id, round, match_number, team1, team2 FROM knockout_matches
    ORDER BY CASE round WHEN 'r32' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 3
             WHEN 'sf' THEN 4 WHEN '3rd' THEN 5 WHEN 'final' THEN 6 END, match_number
  `);

  // Organise by round for easy lookup
  const byRound = {};
  for (const row of dbRes.rows) {
    if (!byRound[row.round]) byRound[row.round] = [];
    byRound[row.round].push(row);
  }

  const updated = [];

  for (const g of koGames) {
    const slots = byRound[g.round] || [];

    // Match to DB slot: first by team-name pair, then by next empty slot
    let slot = slots.find(s =>
      (s.team1 === g.homeEs && s.team2 === g.awayEs) ||
      (s.team1 === g.awayEs && s.team2 === g.homeEs)
    );

    if (!slot) {
      const empty = slots.find(s => !s.team1 && !s.team2);
      if (empty) {
        await query(
          `UPDATE knockout_matches SET team1 = $1, team2 = $2 WHERE id = $3`,
          [g.homeEs, g.awayEs, empty.id]
        );
        empty.team1 = g.homeEs;
        empty.team2 = g.awayEs;
        slot = empty;
        updated.push(`teams:${g.round}#${slot.match_number}`);
      }
    }

    if (!slot) continue;

    // Record result when finished (including draws at 90 min)
    if (!g.isFinished || g.homeScore === null || g.awayScore === null) continue;

    const isDraw = g.homeScore === g.awayScore;
    // result_90 is based on which slot the home team occupies
    const homeIsTeam1 = slot.team1 === g.homeEs;
    const result90 = isDraw ? 'x' : (g.homeScore > g.awayScore ? (homeIsTeam1 ? '1' : '2') : (homeIsTeam1 ? '2' : '1'));
    const winner = isDraw ? null : (g.homeScore > g.awayScore ? g.homeEs : g.awayEs);
    const loser  = isDraw ? null : (g.homeScore > g.awayScore ? g.awayEs : g.homeEs);

    await query(`
      INSERT INTO knockout_results (match_id, winner, result_90, entered_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (match_id) DO UPDATE
        SET winner = EXCLUDED.winner, result_90 = EXCLUDED.result_90, entered_at = NOW()
    `, [slot.id, winner, result90]);
    updated.push(`result:${g.round}#${slot.match_number}=${result90}${winner ? `(${winner})` : '(draw)'}`);

    if (isDraw) continue; // don't advance until ET/PEN winner is known (admin sets manually)

    // Advance winner to next round (only fill empty slots)
    const next = BRACKET_NEXT[g.round]?.[slot.match_number];
    if (next) {
      const nextSlots = byRound[next.r] || [];
      const nextSlot = nextSlots.find(s => s.match_number === next.m);
      if (nextSlot) {
        const col = next.s === 1 ? 'team1' : 'team2';
        if (!nextSlot[col]) {
          await query(`UPDATE knockout_matches SET ${col} = $1 WHERE id = $2`, [winner, nextSlot.id]);
          nextSlot[col] = winner;
          updated.push(`advance:${winner}→${next.r}#${next.m}`);
        }
      }
    }

    // SF losers advance to 3rd-place match
    if (g.round === 'sf') {
      const loserNext = SF_LOSER_NEXT[slot.match_number];
      if (loserNext) {
        const thirdSlots = byRound['3rd'] || [];
        const thirdSlot = thirdSlots.find(s => s.match_number === loserNext.m);
        if (thirdSlot) {
          const col = loserNext.s === 1 ? 'team1' : 'team2';
          if (!thirdSlot[col]) {
            await query(`UPDATE knockout_matches SET ${col} = $1 WHERE id = $2`, [loser, thirdSlot.id]);
            updated.push(`advance:${loser}→3rd#${loserNext.m}`);
          }
        }
      }
    }
  }

  if (updated.length > 0) {
    revalidateTag('knockout-matches');
    revalidateTag('knockout-results');
  }

  return updated;
}
