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

export const GAME_STATE = {
    MENU: 'menu',
    NAME_INPUT: 'name_input',
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
    fireTrap: 4,
    resetTrap: 5,
    darknessTrap: 6,
    timePowerUp: 7,
    torchPowerUp: 8,
    visionPowerUp: 9,
};

export const TRAPS = {
    4: {
        name: 'fire',
        damage: 25,
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
    TORCH: 5000, // 5 seconds of extra light
    VISION: 3000, // 3 seconds of full map reveal
};
