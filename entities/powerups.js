// ============================================================
// entities/powerups.js
// Power-up collection, effect timer decay, and side-effects
// on torch radius and camera mode.
//
// Power-up tile values (from TILE_MAP):
//   7 — Time Crystal  : +30 s to countdown, tile → spentTime (11)
//   8 — Torch Boost   : doubles torch radius for TORCH ms
//   9 — Vision Orb    : reveals full map for VISION ms
//
// After collection each tile is replaced with its "spent" variant
// (11, 12, or 13) which shows a dimmed idle animation but can no
// longer be collected.
//
// Torch radius lerp logic:
//   Torch boost active  → lerp toward TORCH_RADIUS_BASE × 2
//   Darkness active     → handled by traps.js (lower priority)
//   Neither active      → lerp back toward TORCH_RADIUS_BASE
//
// Vision Orb camera logic:
//   While visionEffectTimer > 0 → enableCamera = false (full-map view)
//   Otherwise                   → enableCamera = !debugMode
// ============================================================

import {
    TILE_MAP,
    POWER_UP_DURATIONS,
    GAME_STATE,
    TORCH_RADIUS_BASE,
} from '../common/constants.js';

/**
 * Checks the player's current tile for a collectable power-up,
 * collects it if present, decays all active effect timers, and applies
 * ongoing side-effects to the torch radius and camera mode.
 *
 * This function is called once per frame from handleGameplayLogic() in
 * main.js.  It returns updated values — the caller merges them back into
 * game state.  The maze array IS mutated directly (tile replacement on
 * collection) because the maze itself is mutable state owned by main.js.
 *
 * @param {object}  params
 * @param {string}    params.currentGameState    - must be GAME_STATE.PLAYING to run
 * @param {object}    params.player              - { gridX, gridY }
 * @param {number[][]} params.maze               - mutable; tile is replaced on collect
 * @param {number}    params.dt                  - frame delta time in ms
 * @param {number}    params.timeLeft            - current countdown in seconds
 * @param {number}    params.timeBonusTextTimer  - ms remaining for the "+30s" flash text
 * @param {number}    params.torchEffectTimer    - ms remaining of Torch Boost effect
 * @param {number}    params.visionEffectTimer   - ms remaining of Vision Orb effect
 * @param {number}    params.darknessEffectTimer - ms remaining of darkness trap effect
 * @param {number}    params.torchRadius         - current torch radius in tile units
 * @param {boolean}   params.debugMode           - if true, camera is always disabled
 *
 * @returns {{
 *   timeLeft:          number,
 *   timeBonusTextTimer: number,
 *   torchEffectTimer:  number,
 *   visionEffectTimer: number,
 *   torchRadius:       number,
 *   enableCamera:      boolean
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

    // Only process power-ups during active gameplay
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

    // ── Decay all active effect timers ────────────────────────────────────
    let newTimeBonusTimer = Math.max(0, timeBonusTextTimer - dt);
    let newTorchTimer = Math.max(0, torchEffectTimer - dt);
    let newVisionTimer = Math.max(0, visionEffectTimer - dt);
    let newTimeLeft = timeLeft;

    // ── Collect power-up if standing on one ──────────────────────────────
    if (tile === TILE_MAP.timePowerUp) {
        newTimeLeft += 30; // +30 seconds
        newTimeBonusTimer = 3000; // show "+30s" text for 3 s
        maze[y][x] = TILE_MAP.spentTime;
    } else if (tile === TILE_MAP.torchPowerUp) {
        newTorchTimer = POWER_UP_DURATIONS.TORCH;
        maze[y][x] = TILE_MAP.spentTorch;
    } else if (tile === TILE_MAP.visionPowerUp) {
        newVisionTimer = POWER_UP_DURATIONS.VISION;
        maze[y][x] = TILE_MAP.spentVision;
    }

    // ── Camera: Vision Orb disables follow-cam (shows full maze) ─────────
    const newEnableCamera = newVisionTimer > 0 ? false : !debugMode;

    // ── Torch radius: lerp toward boosted or base target ─────────────────
    // Torch boost takes priority over the darkness recovery in traps.js.
    let newTorchRadius = torchRadius;
    if (newTorchTimer > 0) {
        // Boost active — approach 2× base
        newTorchRadius =
            torchRadius + (TORCH_RADIUS_BASE * 2 - torchRadius) * 0.1;
    } else if (darknessEffectTimer <= 0) {
        // No darkness — gradually restore base radius
        newTorchRadius = torchRadius + (TORCH_RADIUS_BASE - torchRadius) * 0.1;
    }
    // When darkness IS active but no boost: traps.js handles the radius shrink

    return {
        timeLeft: newTimeLeft,
        timeBonusTextTimer: newTimeBonusTimer,
        torchEffectTimer: newTorchTimer,
        visionEffectTimer: newVisionTimer,
        torchRadius: newTorchRadius,
        enableCamera: newEnableCamera,
    };
}
