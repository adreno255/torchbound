// ============================================================
// entities/powerups.js
// Power-up collection, effect timer decay, and side-effects
// on torch radius and camera mode.
// ============================================================

import {
    TILE_MAP,
    POWER_UP_DURATIONS,
    GAME_STATE,
} from '../common/constants.js';

/**
 * Checks the player's current tile for a power-up, collects it if present,
 * decays active effect timers, and applies ongoing torch/camera side-effects.
 * Returns updated values — the caller merges them back into game state.
 *
 * @param {object} params
 * @param {string}   params.currentGameState
 * @param {object}   params.player
 * @param {number[][]} params.maze
 * @param {number}   params.dt
 * @param {number}   params.timeLeft
 * @param {number}   params.timeBonusTextTimer
 * @param {number}   params.torchEffectTimer
 * @param {number}   params.visionEffectTimer
 * @param {number}   params.darknessEffectTimer
 * @param {number}   params.torchRadius
 * @param {boolean}  params.debugMode
 * @returns {{
 *   timeLeft, timeBonusTextTimer,
 *   torchEffectTimer, visionEffectTimer,
 *   torchRadius, enableCamera
 * }}
 */
export function checkPowerUps(params) {
    const {
        currentGameState,
        player,
        maze,
        dt,
        timeLeft,
        timeBonusTextTimer,
        torchEffectTimer,
        visionEffectTimer,
        darknessEffectTimer,
        torchRadius,
        debugMode,
    } = params;

    if (currentGameState !== GAME_STATE.PLAYING) {
        return {
            timeLeft,
            timeBonusTextTimer,
            torchEffectTimer,
            visionEffectTimer,
            torchRadius,
            enableCamera: true,
        };
    }

    const x = player.gridX;
    const y = player.gridY;
    const tile = maze[y][x];

    // Decay timers
    let newTimeBonusTimer = Math.max(0, timeBonusTextTimer - dt);
    let newTorchTimer = Math.max(0, torchEffectTimer - dt);
    let newVisionTimer = Math.max(0, visionEffectTimer - dt);
    let newTimeLeft = timeLeft;

    // Collect power-up on the current tile
    if (tile === TILE_MAP.timePowerUp) {
        newTimeLeft += 30;
        newTimeBonusTimer = 3000;
        maze[y][x] = TILE_MAP.spentTime;
    } else if (tile === TILE_MAP.torchPowerUp) {
        newTorchTimer = POWER_UP_DURATIONS.TORCH;
        maze[y][x] = TILE_MAP.spentTorch;
    } else if (tile === TILE_MAP.visionPowerUp) {
        newVisionTimer = POWER_UP_DURATIONS.VISION;
        maze[y][x] = TILE_MAP.spentVision;
    }

    // Vision power-up disables the camera (reveals full map)
    const newEnableCamera = newVisionTimer > 0 ? false : !debugMode;

    // Lerp torch radius toward boosted or base value
    let newTorchRadius = torchRadius;
    if (newTorchTimer > 0) {
        newTorchRadius = torchRadius + (6 - torchRadius) * 0.1;
    } else if (darknessEffectTimer <= 0) {
        newTorchRadius = torchRadius + (3 - torchRadius) * 0.1;
    }

    return {
        timeLeft: newTimeLeft,
        timeBonusTextTimer: newTimeBonusTimer,
        torchEffectTimer: newTorchTimer,
        visionEffectTimer: newVisionTimer,
        torchRadius: newTorchRadius,
        enableCamera: newEnableCamera,
    };
}
