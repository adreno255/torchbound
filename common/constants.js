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
    ACCOUNTS: 'accounts', // renamed from NAME_INPUT
    TUTORIAL_PROMPT: 'tutorial_prompt',
    TUTORIAL: 'tutorial',
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
        name: 'fire',
        activeTime: 2000,
        inactiveTime: 1500,
        type: 'damage',
        randomized: true,
    },
    5: {
        name: 'teleport',
        activeTime: 1000,
        inactiveTime: 2000,
        type: 'reset',
        randomized: true,
    },
    6: {
        name: 'void',
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
