// ============================================================
// entities/traps.js
// Trap activity cycles and player-trap collision effects.
// ============================================================

import {
    TRAPS,
    TRAP_DAMAGE_INTERVAL_MS,
    DARKNESS_DURATION,
    GAME_STATE,
} from '../constants.js';

/**
 * Returns true if the trap at (x, y) is in its active phase.
 * Each trap gets a positional time offset so they don't all pulse in sync.
 *
 * @param {number} tileId
 * @param {number} x
 * @param {number} y
 * @param {number} trapTimer - global elapsed ms
 * @returns {boolean}
 */
export function isTrapActive(tileId, x, y, trapTimer) {
    const trap = TRAPS[tileId];
    if (!trap) return false;

    const cycle = trap.activeTime + trap.inactiveTime;
    const offset = trap.randomized ? (x * 777 + y * 999) % cycle : 0;

    return (trapTimer + offset) % cycle < trap.activeTime;
}

/**
 * Checks if the player is standing on an active trap and applies its effect.
 * Returns updated timer values — the caller is responsible for merging them.
 *
 * @param {object} params
 * @param {string}   params.currentGameState
 * @param {object}   params.player
 * @param {number[][]} params.maze
 * @param {number}   params.trapTimer
 * @param {number}   params.trapDamageTimer
 * @param {number}   params.darknessEffectTimer
 * @param {number}   params.torchRadius
 * @param {number}   params.torchEffectTimer
 * @param {number}   params.dt
 * @param {function} params.onDamage - callback(amount)
 * @param {function} params.onReset  - callback() — teleports player to start
 * @returns {{ trapDamageTimer, darknessEffectTimer, torchRadius }}
 */
export function checkStandingOnTrap(params) {
    const {
        currentGameState,
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
    } = params;

    if (currentGameState !== GAME_STATE.PLAYING) {
        return { trapDamageTimer, darknessEffectTimer, torchRadius };
    }

    const x = player.gridX;
    const y = player.gridY;
    const tile = maze[y][x];
    const trap = TRAPS[tile];

    let newDarknessTimer = Math.max(0, darknessEffectTimer - dt);
    let newDamageTimer = trapDamageTimer;
    let newTorchRadius = torchRadius;

    if (!trap || !isTrapActive(tile, x, y, trapTimer)) {
        // Gradually restore torch radius when no darkness effect is active
        if (newDarknessTimer <= 0 && torchRadius < 3 && torchEffectTimer <= 0) {
            newTorchRadius = torchRadius + (3 - torchRadius) * 0.05;
        }
        return {
            trapDamageTimer: 0,
            darknessEffectTimer: newDarknessTimer,
            torchRadius: newTorchRadius,
        };
    }

    switch (trap.type) {
        case 'damage':
            if (newDamageTimer <= 0) {
                onDamage(trap.damage);
                newDamageTimer = TRAP_DAMAGE_INTERVAL_MS;
            }
            break;
        case 'reset':
            onReset();
            break;
        case 'darkness':
            newDarknessTimer = DARKNESS_DURATION;
            break;
    }

    if (newDarknessTimer > 0) {
        newTorchRadius = torchRadius + (0.25 - torchRadius) * 0.1;
    }

    return {
        trapDamageTimer: newDamageTimer,
        darknessEffectTimer: newDarknessTimer,
        torchRadius: newTorchRadius,
    };
}
