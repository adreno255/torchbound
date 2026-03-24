// ============================================================
// entities/traps.js
// Trap activity cycles and player–trap collision effects.
//
// Each trap oscillates between an active ("on") phase and an
// inactive ("off") phase.  The cycle period and phase offset are
// deterministic given the trap type and tile position, so the
// same maze always produces the same trap patterns.
//
// Trap types (TILE_MAP values 4–6):
//   4 — spike    : periodic HP damage (damage scales with level)
//   5 — pit      : teleports player back to the start tile
//   6 — darkness : shrinks the torch radius for DARKNESS_DURATION ms
// ============================================================

import {
    TRAPS,
    TRAP_DAMAGE_INTERVAL_MS,
    DARKNESS_DURATION,
    GAME_STATE,
    getTrapDamage,
    TORCH_RADIUS_BASE,
} from '../common/constants.js';

// ── Activity check ────────────────────────────────────────────────────────

/**
 * Returns true if the trap at (x, y) is currently in its active phase.
 *
 * Activity is determined by:
 *   1. The global trapTimer (ms elapsed since level start).
 *   2. A positional offset derived from (x, y) so nearby traps of the
 *      same type don't pulse in sync — adds variety to the maze feel.
 *   3. The trap's own activeTime / inactiveTime cycle from TRAPS[].
 *
 * The offset formula:  (x × 777 + y × 999) mod cycle
 * This is a simple hash that spreads trap phases without randomness,
 * keeping the function pure (same inputs → same output) and consistent
 * across frames.
 *
 * @param {number} tileId    - TILE_MAP value of the trap (4, 5, or 6)
 * @param {number} x         - tile grid column
 * @param {number} y         - tile grid row
 * @param {number} trapTimer - global elapsed ms (from main.js state)
 * @returns {boolean}
 */
export function isTrapActive(tileId, x, y, trapTimer) {
    const trap = TRAPS[tileId];
    if (!trap) return false;

    const cycle = trap.activeTime + trap.inactiveTime;
    const offset = trap.randomized ? (x * 777 + y * 999) % cycle : 0;

    return (trapTimer + offset) % cycle < trap.activeTime;
}

// ── Collision & effect handler ────────────────────────────────────────────

/**
 * Checks whether the player is standing on an active trap and applies
 * its effect.  Also decays the darkness timer and gradually restores
 * the torch radius when no traps are active.
 *
 * This function is pure in the sense that it does NOT mutate main.js
 * state directly — it returns updated values and the caller merges them.
 * Side effects (animation triggers, sound, damage) are delivered through
 * the three callback parameters.
 *
 * Trap behaviours:
 *   'damage'   — fires onDamage(amount) once every TRAP_DAMAGE_INTERVAL_MS ms
 *                while the player remains on the tile.
 *   'reset'    — fires onReset() immediately; no delay.
 *   'darkness' — resets darknessEffectTimer to DARKNESS_DURATION and fires
 *                onDarkness() (used to trigger the dim animation, once, via
 *                edge detection in main.js).
 *
 * Torch radius side-effects:
 *   - Darkness active   → lerp torchRadius toward 0.25 (near-zero glow)
 *   - Darkness inactive → lerp torchRadius back toward TORCH_RADIUS_BASE
 *     (only when torchEffectTimer is also 0; the torch power-up overrides this)
 *
 * @param {object} params
 * @param {string}     params.currentGameState      - must be GAME_STATE.PLAYING to run
 * @param {number}     params.currentLevel          - scales spike trap damage (1–5)
 * @param {object}     params.player                - { gridX, gridY }
 * @param {number[][]} params.maze
 * @param {number}     params.trapTimer             - global elapsed ms
 * @param {number}     params.trapDamageTimer       - ms until next damage tick is allowed
 * @param {number}     params.darknessEffectTimer   - remaining ms of darkness effect
 * @param {number}     params.torchRadius           - current torch radius in tile units
 * @param {number}     params.torchEffectTimer      - remaining ms of torch boost power-up
 * @param {number}     params.dt                    - frame delta time in ms
 * @param {function}   params.onDamage              - callback(amount: number)
 * @param {function}   params.onReset               - callback()
 * @param {function}   [params.onDarkness]          - callback() — fired once when darkness begins
 * @returns {{ trapDamageTimer: number, darknessEffectTimer: number, torchRadius: number }}
 */
export function checkStandingOnTrap(params) {
    const {
        currentGameState,
        currentLevel,
        player,
        maze,
        trapTimer,
        trapDamageTimer,
        darknessEffectTimer,
        torchRadius,
        torchEffectTimer,
        dt,
        onDamage,
        onReset,
        onDarkness,
    } = params;

    // Only process traps during active gameplay
    if (currentGameState !== GAME_STATE.PLAYING) {
        return { trapDamageTimer, darknessEffectTimer, torchRadius };
    }

    const x = player.gridX;
    const y = player.gridY;
    const tile = maze[y][x];
    const trap = TRAPS[tile];

    // Tick down darkness regardless of current tile
    let newDarknessTimer = Math.max(0, darknessEffectTimer - dt);
    let newDamageTimer = trapDamageTimer;
    let newTorchRadius = torchRadius;

    if (!trap || !isTrapActive(tile, x, y, trapTimer)) {
        // ── Not on an active trap ─────────────────────────────────────────
        // Gradually restore torch radius once darkness wears off
        if (
            newDarknessTimer <= 0 &&
            torchRadius < TORCH_RADIUS_BASE &&
            torchEffectTimer <= 0
        ) {
            newTorchRadius =
                torchRadius + (TORCH_RADIUS_BASE - torchRadius) * 0.05;
        }
        return {
            trapDamageTimer: 0, // reset damage interval on safe tile
            darknessEffectTimer: newDarknessTimer,
            torchRadius: newTorchRadius,
        };
    }

    // ── Active trap — apply effect ────────────────────────────────────────
    switch (trap.type) {
        case 'damage':
            // Rate-limit damage so it fires at most once per TRAP_DAMAGE_INTERVAL_MS
            if (newDamageTimer <= 0) {
                const damage = getTrapDamage(currentLevel ?? 1);
                onDamage(damage);
                newDamageTimer = TRAP_DAMAGE_INTERVAL_MS;
            }
            break;

        case 'reset':
            // Instant teleport — no rate limiting
            onReset();
            break;

        case 'darkness':
            // Refresh darkness duration; only fire the callback on the edge
            // (edge detection lives in main.js via prevDarknessTimer comparison)
            newDarknessTimer = DARKNESS_DURATION;
            if (onDarkness) onDarkness();
            break;
    }

    // While darkness is active, push torch radius toward near-zero
    if (newDarknessTimer > 0) {
        newTorchRadius = torchRadius + (0.25 - torchRadius) * 0.1;
    }

    return {
        trapDamageTimer: newDamageTimer,
        darknessEffectTimer: newDarknessTimer,
        torchRadius: newTorchRadius,
    };
}
