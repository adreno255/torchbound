// ============================================================
// playerProfile.js
// Unified per-player profile — now backed by Supabase.
//
// Public API is identical to the localStorage version so main.js
// needs zero changes.  All heavy async ops are fire-and-forget or
// awaited inside async wrappers; p.draw() only reads the in-memory
// cache that is kept in sync automatically.
//
// localStorage is still used for ONE thing only:
//   torchbound_active_player → the active player's ID string
// This lets the game remember who was logged in across sessions
// without an extra DB round-trip on startup.
// ============================================================

import { db } from './supabase.js';

const ACTIVE_KEY = 'torchbound_active_player';

// ── In-memory cache ───────────────────────────────────────────────────────
// Populated by _loadActiveProfile() on startup and after any write.
let _cachedProfile = null;

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
    for (let i = 1; i < 24; i++) id += chars[arr[i] % chars.length];
    return id;
}

// ── Tag / display name helpers ────────────────────────────────────────────

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

// ── DB row ↔ profile object conversion ───────────────────────────────────

function rowToProfile(row) {
    return {
        playerId: row.player_id,
        username: row.username,
        unlockedLevel: row.unlocked_level,
        highScores: row.high_scores,
        tutorialDone: row.tutorial_done,
    };
}

function profileToRow(profile) {
    return {
        player_id: profile.playerId,
        username: profile.username,
        unlocked_level: profile.unlockedLevel,
        high_scores: profile.highScores,
        tutorial_done: profile.tutorialDone,
    };
}

// ── Active player (localStorage) ─────────────────────────────────────────

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
    _cachedProfile = null;
}

// ── DB read helpers ───────────────────────────────────────────────────────

async function _fetchProfile(playerId) {
    if (!playerId) return null;
    const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();
    if (error || !data) return null;
    return rowToProfile(data);
}

/**
 * Loads the active profile from Supabase and populates the cache.
 * Called once on startup (from main.js) and after any write.
 */
export async function _loadActiveProfile() {
    const id = getActivePlayerId();
    _cachedProfile = await _fetchProfile(id);
}

// ── Synchronous cache reads (used by p.draw()) ────────────────────────────

export function getActiveProfile() {
    return _cachedProfile;
}

// ── Profile CRUD ──────────────────────────────────────────────────────────

/**
 * Creates a new profile in Supabase and sets it as active.
 * Returns the created profile (synchronously via the local object —
 * the DB write happens async in the background).
 */
export async function createProfile(username) {
    const playerId = generatePlayerId();
    const profile = {
        playerId,
        username,
        unlockedLevel: 1,
        highScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        tutorialDone: false,
    };

    const { error } = await db.from('profiles').insert(profileToRow(profile));
    if (error) console.error('[profile] createProfile error:', error.message);

    setActivePlayerId(playerId);
    _cachedProfile = profile;
    return profile;
}

/**
 * Looks up a profile directly by its player ID.
 * Used by the "Switch Account" flow.
 */
export async function readProfileById(playerId) {
    return _fetchProfile(playerId);
}

/**
 * Returns the active player's profile from the in-memory cache.
 * Call _loadActiveProfile() on startup to populate it.
 */
export function getActiveProfileSync() {
    return _cachedProfile;
}

/**
 * Merges partial updates into the active profile and persists to Supabase.
 */
export async function updateActiveProfile(updates) {
    const profile = _cachedProfile;
    if (!profile) return;

    const merged = { ...profile, ...updates };
    _cachedProfile = merged;

    const { error } = await db
        .from('profiles')
        .update(profileToRow(merged))
        .eq('player_id', merged.playerId);

    if (error)
        console.error('[profile] updateActiveProfile error:', error.message);
}

// ── Convenience helpers ───────────────────────────────────────────────────

/**
 * Returns the highest unlocked level for the active player.
 * Returns 1 if no active player.
 *
 * @returns {number}
 */
export function getMaxUnlockedLevel() {
    return _cachedProfile ? _cachedProfile.unlockedLevel : 1;
}

export async function unlockLevel(level) {
    const profile = _cachedProfile;
    if (!profile) return;
    if (level > profile.unlockedLevel) {
        await updateActiveProfile({ unlockedLevel: level });
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
    return _cachedProfile ? (_cachedProfile.highScores[level] ?? 0) : 0;
}

export async function updatePersonalBest(level, score) {
    const profile = _cachedProfile;
    if (!profile) return;
    const current = profile.highScores[level] ?? 0;
    if (score > current) {
        await updateActiveProfile({
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
    return _cachedProfile ? _cachedProfile.tutorialDone : true;
}

export async function markTutorialDone() {
    await updateActiveProfile({ tutorialDone: true });
}
