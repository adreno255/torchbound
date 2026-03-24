// ============================================================
// constants.js
// All game-wide constants, enums, and configuration values.
// ============================================================

export const BASE_WIDTH = 800;
export const BASE_HEIGHT = 600;
export const TILE_SIZE = 32;
export const MOVE_DELAY_MS = 400;
export const TRAP_DAMAGE_INTERVAL_MS = 500;
export const ZOOM = 1.5;
export const CAMERA_LERP = 0.05;
export const DARKNESS_DURATION = 5000;
export const TORCH_RADIUS_BASE = 2;

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
};

export const GAME_PHASE = {
    INTRO_REVEAL: 'intro_reveal',
    INTRO_PAN: 'intro_pan',
    PLAYING: 'playing',
};

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
    // Tutorial stop-point markers (values 20–30, rendered as plain floor)
    // A=20, D=21, B=22, E=23, C=24, F=25, G=26, H=27, I=28, J=29, K=30
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

/**
 * Returns the trap damage amount for the given level.
 *   Levels 1–2 →  10 HP
 *   Levels 3–4 →  25 HP
 *   Level  5   →  50 HP
 *
 * @param {number} level - current level (1–5)
 * @returns {number}
 */
export function getTrapDamage(level) {
    if (level <= 2) return 10;
    if (level <= 4) return 25;
    return 50;
}

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

export const POWER_UP_DURATIONS = {
    TORCH: 5000,
    VISION: 3000,
};

/**
 * Returns true if the given tile value is a tutorial stop-point marker.
 * These tiles render as floor and have no effect on game logic.
 *
 * @param {number} tile
 * @returns {boolean}
 */
export function isTutorialMarker(tile) {
    return tile >= 20 && tile <= 30;
}
