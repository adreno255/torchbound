// ============================================================
// common/constants.js
// All game-wide constants, enums, and configuration values.
//
// This is the single source of truth for tuning numbers.
// Change values here — not scattered across files — to adjust
// game feel (move speed, trap damage, torch radius, etc.).
// ============================================================

// ── Canvas / world dimensions ─────────────────────────────────────────────

/** Logical base canvas width in CSS pixels (before scale factor). */
export const BASE_WIDTH = 800;

/** Logical base canvas height in CSS pixels (before scale factor). */
export const BASE_HEIGHT = 600;

/** Size of one maze tile in pixels (source and world space). */
export const TILE_SIZE = 32;

// ── Player movement ───────────────────────────────────────────────────────

/**
 * Minimum milliseconds between player grid steps.
 * Lower = faster movement. Affects both tap and held-key repeat rate.
 */
export const MOVE_DELAY_MS = 400;

// ── Camera ────────────────────────────────────────────────────────────────

/**
 * Camera zoom multiplier applied on top of the window scale factor.
 * 1.5 means the viewport shows 1/1.5× the world width/height.
 */
export const ZOOM = 1.5;

/**
 * Linear interpolation factor per frame for camera follow smoothing.
 * Higher = snappier follow; lower = more cinematic lag.
 */
export const CAMERA_LERP = 0.05;

// ── Trap system ───────────────────────────────────────────────────────────

/**
 * Minimum milliseconds between consecutive damage ticks from the spike trap.
 * Prevents damage from firing every frame while the player stands on it.
 */
export const TRAP_DAMAGE_INTERVAL_MS = 500;

/**
 * Duration in milliseconds of the darkness effect applied by a darkness trap.
 * During this window the torch radius is forcibly shrunk.
 */
export const DARKNESS_DURATION = 5000;

// ── Torch / fog ───────────────────────────────────────────────────────────

/**
 * Default torch visibility radius measured in tile units (not pixels).
 * Converted to pixels at render time by multiplying by TILE_SIZE.
 * The fog gradient extends from (radius − 0.5) to (radius + 1.5) tiles.
 */
export const TORCH_RADIUS_BASE = 2;

// ── Game state enum ───────────────────────────────────────────────────────

/**
 * Top-level application / screen states.
 * main.js uses currentGameState to route draw() to the correct screen
 * and to gate gameplay logic.
 *
 * @enum {string}
 */
export const GAME_STATE = {
    MENU: 'menu',
    ACCOUNTS: 'accounts',
    TUTORIAL_PROMPT: 'tutorial_prompt',
    TUTORIAL: 'tutorial',
    TUTORIAL_CLEARED: 'tutorial_cleared',
    TUTORIAL_GAMEOVER: 'tutorial_gameover',
    LEVEL_SELECT: 'level_select',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover',
    VICTORY: 'victory',
    GLOBAL_LEADERBOARD: 'global_leaderboard',
    ABOUT: 'about',
};

// ── Game phase enum ───────────────────────────────────────────────────────

/**
 * Sub-states within a single level run that govern the intro sequence.
 * Managed by handleGamePhase() in main.js.
 *
 * Flow: INTRO_REVEAL → INTRO_PAN → PLAYING
 *
 * @enum {string}
 */
export const GAME_PHASE = {
    INTRO_REVEAL: 'intro_reveal',
    INTRO_PAN: 'intro_pan',
    PLAYING: 'playing',
};

// ── Tile map enum ─────────────────────────────────────────────────────────

/**
 * Integer values stored in the 2-D maze array.
 * drawGrid() in entities/map.js switches on these values to decide
 * which tile sprite or overlay to render.
 *
 * Tile categories:
 *   0–3   : structural (floor, wall, start, exit)
 *   4–6   : traps
 *   7–9   : active power-ups
 *   10–13 : consumed/spent power-up variants
 *   20–30 : tutorial stop-point markers (rendered as plain floor)
 *
 * @enum {number}
 */
export const TILE_MAP = {
    floor: 0,
    wall: 1,
    start: 2,
    exit: 3,
    damageTrap: 4,
    resetTrap: 5,
    darknessTrap: 6,
    timePowerUp: 7,
    torchPowerUp: 8,
    visionPowerUp: 9,
    consumedPowerUp: 10,
    spentTime: 11,
    spentTorch: 12,
    spentVision: 13,

    // Tutorial stop-point markers.
    // Values 20-30 map to letters A–K in tutorial.js.
    // isTutorialMarker() returns true for any value in this range.
    tutorialMarkerA: 20,
    tutorialMarkerD: 21,
    tutorialMarkerB: 22,
    tutorialMarkerE: 23,
    tutorialMarkerC: 24,
    tutorialMarkerF: 25,
    tutorialMarkerG: 26,
    tutorialMarkerH: 27,
    tutorialMarkerI: 28,
    tutorialMarkerJ: 29,
    tutorialMarkerK: 30,
};

// ── Trap definitions ──────────────────────────────────────────────────────

/**
 * Configuration for each trap tile.
 * Keyed by TILE_MAP value (4, 5, 6).
 *
 * Each entry describes the trap's animation cycle and effect type:
 *   activeTime   — ms the trap is in its dangerous "on" state
 *   inactiveTime — ms the trap is in its safe "off" state
 *   type         — 'damage' | 'reset' | 'darkness'
 *   randomized   — if true, each tile gets a positional time offset so
 *                  traps don't all pulse in sync across the maze
 *
 * @type {Record<number, { name: string, activeTime: number, inactiveTime: number, type: string, randomized: boolean }>}
 */
export const TRAPS = {
    4: {
        name: 'spike',
        activeTime: 2000,
        inactiveTime: 1500,
        type: 'damage',
        randomized: true,
    },
    5: {
        name: 'pit',
        activeTime: 1000,
        inactiveTime: 2000,
        type: 'reset',
        randomized: true,
    },
    6: {
        name: 'darkness',
        activeTime: 1500,
        inactiveTime: 1500,
        type: 'darkness',
        randomized: true,
    },
};

// ── Power-up durations ────────────────────────────────────────────────────

/**
 * How long each active power-up effect lasts in milliseconds.
 * These feed into the torchEffectTimer and visionEffectTimer in main.js.
 *
 * @type {{ TORCH: number, VISION: number }}
 */
export const POWER_UP_DURATIONS = {
    /** Torch Boost effect duration. */
    TORCH: 5000,
    /** Vision Orb effect duration. */
    VISION: 3000,
};

// ── Level-scaling helpers ─────────────────────────────────────────────────

/**
 * Returns the spike-trap damage amount for the given level.
 * Damage scales with level difficulty:
 *   Levels 1–2 →  10 HP per tick
 *   Levels 3–4 →  25 HP per tick
 *   Level  5   →  50 HP per tick
 *
 * @param {number} level - current level number (1–5)
 * @returns {number} damage amount
 */
export function getTrapDamage(level) {
    if (level <= 2) return 10;
    if (level <= 4) return 25;
    return 50;
}

// ── Tutorial helpers ──────────────────────────────────────────────────────

/**
 * Returns true if the given tile value is a tutorial stop-point marker
 * (values 20–30). These tiles render as plain floor and are invisible
 * to normal game logic — only the tutorial stop manager reads them.
 *
 * @param {number} tile
 * @returns {boolean}
 */
export function isTutorialMarker(tile) {
    return tile >= 20 && tile <= 30;
}
