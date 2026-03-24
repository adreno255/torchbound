// ============================================================
// leaderboard.js
// Leaderboard reads and writes — now backed by Supabase.
//
// Public API is identical to the localStorage version.
// All functions are async; callers in main.js already handle
// them as fire-and-forget or await them inside async blocks.
// ============================================================

import { db } from './supabase.js';

const PER_LEVEL_CAP = 10;

/**
 * Saves a score for a player on a given level.
 * Upserts — updates only if the new score is higher.
 *
 * @param {number} level
 * @param {string} displayName  - "username#tag" format
 * @param {number} score
 * @param {string} playerId     - the player's raw ID (for upsert key)
 */
export async function saveScore(level, displayName, score, playerId) {
    if (!playerId) return;

    // Read the player's current score for this level
    const { data: existing } = await db
        .from('scores')
        .select('score')
        .eq('player_id', playerId)
        .eq('level', level)
        .maybeSingle();

    if (existing && existing.score >= score) return; // not a personal best

    const { error } = await db.from('scores').upsert(
        {
            player_id: playerId,
            display_name: displayName,
            level,
            score,
        },
        { onConflict: 'player_id,level' },
    );

    if (error) console.error('[leaderboard] saveScore error:', error.message);
}

/**
 * Returns the top-10 scores for a single level, sorted descending.
 *
 * @param {number} level
 * @returns {Promise<{ name: string, score: number }[]>}
 */
export async function getLeaderboard(level) {
    const { data, error } = await db
        .from('scores')
        .select('display_name, score')
        .eq('level', level)
        .order('score', { ascending: false })
        .limit(PER_LEVEL_CAP);

    if (error) {
        console.error('[leaderboard] getLeaderboard error:', error.message);
        return [];
    }

    return (data ?? []).map((row) => ({
        name: row.display_name,
        score: row.score,
    }));
}

/**
 * Aggregates scores across all 5 levels into an overall leaderboard.
 * Returns top 10 by total cumulative score.
 *
 * @returns {Promise<{ name: string, score: number }[]>}
 */
export async function getOverallLeaderboard() {
    // Fetch all scores in one query, then aggregate in JS
    const { data, error } = await db
        .from('scores')
        .select('display_name, score');

    if (error) {
        console.error(
            '[leaderboard] getOverallLeaderboard error:',
            error.message,
        );
        return [];
    }

    const totals = {};
    for (const row of data ?? []) {
        totals[row.display_name] = (totals[row.display_name] ?? 0) + row.score;
    }

    return Object.entries(totals)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, PER_LEVEL_CAP);
}
