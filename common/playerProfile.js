// ============================================================
// playerProfile.js
// Unified per-player profile stored in localStorage.
//
// Each player has their own keyed entry:
//   torchbound_player_{playerId}  →  PlayerProfile object
//
// The "active" player is tracked separately:
//   torchbound_active_player  →  playerId string
//
// PlayerProfile shape:
// {
//   playerId:      string,   — cuid2-style 24-char unique ID
//   username:      string,   — display name (duplicates allowed)
//   unlockedLevel: number,   — highest level unlocked (1–5)
//   highScores:    { 1:number, 2:number, 3:number, 4:number, 5:number },
//   tutorialDone:  boolean,  — true if tutorial was seen or skipped
// }
// ============================================================

const ACTIVE_KEY = 'torchbound_active_player';
const PROFILE_PREFIX = 'torchbound_player_';

// ── ID generation ─────────────────────────────────────────────────────────

/**
 * Generates a cuid2-style 24-character alphanumeric ID.
 * Uses crypto.getRandomValues for entropy.
 *
 * @returns {string} 24-character ID (starts with a letter)
 */
export function generatePlayerId() {
    const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const startChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    let id = startChars[arr[0] % startChars.length];
    for (let i = 1; i < 24; i++) {
        id += chars[arr[i] % chars.length];
    }
    return id;
}

// ── Profile tag helper ────────────────────────────────────────────────────

/**
 * Returns the 4-character tag derived from a player's ID.
 * e.g. playerId "eY2cXfGh..." → "eY2c"
 *
 * @param {string} playerId
 * @returns {string}
 */
export function getPlayerTag(playerId) {
    return playerId ? playerId.slice(0, 4) : '????';
}

/**
 * Returns the full display name including the tag.
 * e.g. "gelo#eY2c"
 *
 * @param {string} username
 * @param {string} playerId
 * @returns {string}
 */
export function getDisplayName(username, playerId) {
    return `${username} #${getPlayerTag(playerId)}`;
}

// ── Default profile factory ───────────────────────────────────────────────

function defaultProfile(playerId, username) {
    return {
        playerId,
        username,
        unlockedLevel: 1,
        highScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        tutorialDone: false,
    };
}

// ── Storage helpers ───────────────────────────────────────────────────────

function profileKey(playerId) {
    return PROFILE_PREFIX + playerId;
}

function readProfile(playerId) {
    try {
        const raw = localStorage.getItem(profileKey(playerId));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeProfile(profile) {
    localStorage.setItem(profileKey(profile.playerId), JSON.stringify(profile));
}

// ── Active player ─────────────────────────────────────────────────────────

/**
 * Returns the active player's ID, or null if none is set.
 * @returns {string|null}
 */
export function getActivePlayerId() {
    return localStorage.getItem(ACTIVE_KEY) || null;
}

/**
 * Sets the active player by ID.
 * @param {string} playerId
 */
export function setActivePlayerId(playerId) {
    localStorage.setItem(ACTIVE_KEY, playerId);
}

/**
 * Clears the active player (guest / no player state).
 */
export function clearActivePlayer() {
    localStorage.removeItem(ACTIVE_KEY);
}

// ── Profile CRUD ──────────────────────────────────────────────────────────

/**
 * Creates a new player profile, saves it, and sets them as active.
 * Returns the created profile.
 *
 * @param {string} username
 * @returns {object} PlayerProfile
 */
export function createProfile(username) {
    const playerId = generatePlayerId();
    const profile = defaultProfile(playerId, username);
    writeProfile(profile);
    setActivePlayerId(playerId);
    return profile;
}

/**
 * Returns the currently active player's profile, or null if no active player.
 * @returns {object|null} PlayerProfile
 */
export function getActiveProfile() {
    const id = getActivePlayerId();
    if (!id) return null;
    return readProfile(id);
}

/**
 * Updates fields on the active player's profile.
 * Merges the given partial object into the stored profile.
 *
 * @param {Partial<PlayerProfile>} updates
 */
export function updateActiveProfile(updates) {
    const profile = getActiveProfile();
    if (!profile) return;
    writeProfile({ ...profile, ...updates });
}

// ── Convenience helpers ───────────────────────────────────────────────────

/**
 * Returns the highest unlocked level for the active player.
 * Returns 1 if no active player.
 *
 * @returns {number}
 */
export function getMaxUnlockedLevel() {
    const profile = getActiveProfile();
    return profile ? profile.unlockedLevel : 1;
}

/**
 * Unlocks a level for the active player if it is higher than current.
 *
 * @param {number} level
 */
export function unlockLevel(level) {
    const profile = getActiveProfile();
    if (!profile) return;
    if (level > profile.unlockedLevel) {
        updateActiveProfile({ unlockedLevel: level });
    }
}

/**
 * Returns true if the given level is unlocked for the active player.
 *
 * @param {number} level
 * @returns {boolean}
 */
export function isLevelUnlocked(level) {
    return level <= getMaxUnlockedLevel();
}

/**
 * Returns the active player's personal best score for a level.
 * Returns 0 if none.
 *
 * @param {number} level
 * @returns {number}
 */
export function getPersonalBest(level) {
    const profile = getActiveProfile();
    return profile ? (profile.highScores[level] ?? 0) : 0;
}

/**
 * Updates the personal best for a level if the new score is higher.
 *
 * @param {number} level
 * @param {number} score
 */
export function updatePersonalBest(level, score) {
    const profile = getActiveProfile();
    if (!profile) return;
    const current = profile.highScores[level] ?? 0;
    if (score > current) {
        updateActiveProfile({
            highScores: { ...profile.highScores, [level]: score },
        });
    }
}

/**
 * Returns whether the active player has completed (or skipped) the tutorial.
 * Returns true (skip tutorial) if no active player.
 *
 * @returns {boolean}
 */
export function hasDoneTutorial() {
    const profile = getActiveProfile();
    return profile ? profile.tutorialDone : true;
}

/**
 * Marks the tutorial as done for the active player.
 */
export function markTutorialDone() {
    updateActiveProfile({ tutorialDone: true });
}
