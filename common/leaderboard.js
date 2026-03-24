// ============================================================
// leaderboard.js
// Handles reading and writing scores to localStorage.
// Keeps a top-10 per level and computes overall cumulative scores.
//
// NOTE: Player identity (username, unlocked levels, tutorial state)
// is now managed by common/playerProfile.js. The leaderboard stores
// entries by display name (e.g. "gelo#eY2c") so scores are globally
// distinguishable even with duplicate usernames.
// ============================================================

const PER_LEVEL_CAP = 10;

/**
 * Saves a score for a player on a given level.
 * Only updates if the new score is a personal best for this display name.
 * Keeps a maximum of 10 entries per level, sorted by score.
 *
 * @param {number} level
 * @param {string} displayName  - "username#tag" format
 * @param {number} score
 */
export function saveScore(level, displayName, score) {
    let leaderboard =
        JSON.parse(localStorage.getItem(`torchbound_lv${level}`)) || [];

    let playerEntryIndex = leaderboard.findIndex(
        (entry) => entry.name.toLowerCase() === displayName.toLowerCase(),
    );

    if (playerEntryIndex !== -1) {
        if (score > leaderboard[playerEntryIndex].score) {
            leaderboard[playerEntryIndex].score = score;
        }
    } else {
        leaderboard.push({ name: displayName, score });
    }

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, PER_LEVEL_CAP);

    localStorage.setItem(`torchbound_lv${level}`, JSON.stringify(leaderboard));
}

/**
 * Returns the full top-10 leaderboard for a single level.
 *
 * @param {number} level
 * @returns {{ name: string, score: number }[]}
 */
export function getLeaderboard(level) {
    return JSON.parse(localStorage.getItem(`torchbound_lv${level}`)) || [];
}

/**
 * Aggregates scores across all 5 levels into an overall leaderboard.
 * Each player's scores from every level are summed together.
 * Returns top 10.
 *
 * @returns {{ name: string, score: number }[]}
 */
export function getOverallLeaderboard() {
    let totals = {};

    for (let i = 1; i <= 5; i++) {
        let levelData =
            JSON.parse(localStorage.getItem(`torchbound_lv${i}`)) || [];
        levelData.forEach((entry) => {
            if (!totals[entry.name]) totals[entry.name] = 0;
            totals[entry.name] += entry.score;
        });
    }

    return Object.entries(totals)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, PER_LEVEL_CAP);
}
