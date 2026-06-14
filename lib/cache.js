import { unstable_cache } from 'next/cache';
import { query } from './db';
import { fetchGameTimes, fetchAllGroupStandings } from './football-api';

// ── Shared DB queries (not user-specific) ────────────────────────────────────
// Cached at the server level so multiple users and multiple renders in the same
// second share one DB round-trip. TTLs are short enough to feel live during matches.

export const getMatchResults = unstable_cache(
  async () => {
    const res = await query(
      'SELECT match_id, result, score_t1, score_t2, match_status FROM match_results'
    ).catch(() => query('SELECT match_id, result FROM match_results'));
    return res.rows;
  },
  ['match-results'],
  { revalidate: 30, tags: ['match-results'] }
);

export const getGroupResults = unstable_cache(
  async () => {
    const res = await query('SELECT group_key, first_team, second_team FROM group_results');
    return res.rows;
  },
  ['group-results'],
  { revalidate: 60, tags: ['group-results'] }
);

export const getKnockoutMatches = unstable_cache(
  async () => {
    const res = await query(`
      SELECT id, round, match_number, team1, team2, match_date, locked, picks_open_from
      FROM knockout_matches
      ORDER BY CASE round
        WHEN 'r32' THEN 1 WHEN 'r16' THEN 2 WHEN 'qf' THEN 3
        WHEN 'sf' THEN 4 WHEN '3rd' THEN 5 WHEN 'final' THEN 6
      END, match_number
    `);
    return res.rows;
  },
  ['knockout-matches'],
  { revalidate: 60, tags: ['knockout-matches'] }
);

export const getKnockoutResults = unstable_cache(
  async () => {
    const res = await query('SELECT match_id, winner FROM knockout_results');
    return res.rows;
  },
  ['knockout-results'],
  { revalidate: 30, tags: ['knockout-results'] }
);

// ── External API calls ────────────────────────────────────────────────────────
// force-dynamic on pages opts out of fetch() caching, so we wrap these at the
// function level with unstable_cache so they still benefit from server-side memoisation.

export const getCachedGameTimes = unstable_cache(
  () => fetchGameTimes(),
  ['game-times'],
  { revalidate: 300 }   // 5 min — kick-off times rarely change
);

export const getCachedGroupStandings = unstable_cache(
  () => fetchAllGroupStandings(),
  ['group-standings'],
  { revalidate: 120 }   // 2 min — updates during/after matches
);
