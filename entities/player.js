// ============================================================
// entities/player.js
// Player creation, grid movement, collision, and damage.
//
// SPRITE NOTE:
// drawPlayer() currently renders a white rectangle placeholder.
// Replace the fill+rect block with:
//   p.image(sprites.player, player.gridX * TILE_SIZE, player.gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE)
// ============================================================

import { TILE_SIZE, TILE_MAP, MOVE_DELAY_MS } from '../common/constants.js';

/**
 * Returns a fresh player state object.
 *
 * @returns {{ gridX: null, gridY: null, hp: number, maxHp: number }}
 */
export function createPlayer() {
    return { gridX: null, gridY: null, hp: 100, maxHp: 100 };
}

/**
 * Scans the maze for the start tile and positions the player there.
 *
 * @param {object}   player
 * @param {number[][]} maze
 * @param {number}   gridRows
 * @param {number}   gridColumns
 */
export function findStartTile(player, maze, gridRows, gridColumns) {
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridColumns; x++) {
            if (maze[y][x] === TILE_MAP.start) {
                player.gridX = x;
                player.gridY = y;
                return;
            }
        }
    }
}

/**
 * Attempts to move the player based on currently held keys.
 * Movement is gated behind MOVE_DELAY_MS to prevent too-fast movement.
 * Returns the updated moveTimer (reset to 0 on a successful move attempt).
 *
 * @param {object} p - p5 instance
 * @param {object} player
 * @param {number} moveTimer
 * @param {number[][]} maze
 * @param {number} gridRows
 * @param {number} gridColumns
 * @returns {number} updated moveTimer
 */
export function movePlayer(p, player, moveTimer, maze, gridRows, gridColumns) {
    if (moveTimer < MOVE_DELAY_MS) return moveTimer;

    let dx = 0,
        dy = 0;

    if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) dy = -1;
    else if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) dy = 1;
    else if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) dx = -1;
    else if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) dx = 1;
    else return moveTimer;

    if (
        isWalkable(
            player.gridX + dx,
            player.gridY + dy,
            maze,
            gridRows,
            gridColumns,
        )
    ) {
        player.gridX += dx;
        player.gridY += dy;
    }

    return 0;
}

/**
 * Returns true if the tile at (x, y) is in-bounds and not a wall.
 */
export function isWalkable(x, y, maze, gridRows, gridColumns) {
    if (x < 0 || y < 0 || x >= gridColumns || y >= gridRows) return false;
    return maze[y][x] !== 1;
}

/**
 * Reduces the player's HP by `amount`, clamped to [0, maxHp].
 * Returns true if the player has died.
 *
 * @param {object} player
 * @param {number} amount
 * @returns {boolean} isDead
 */
export function takeDamage(player, amount) {
    player.hp = Math.max(0, Math.min(player.maxHp, player.hp - amount));
    return player.hp <= 0;
}

/**
 * Draws the player at their current grid position.
 * TODO: Replace with p.image(sprites.player, ...)
 *
 * @param {object} p - p5 instance
 * @param {object} player
 */
export function drawPlayer(p, player) {
    // ── PLACEHOLDER ──────────────────────────────────────────────────────────
    // TODO: p.image(sprites.player, player.gridX * TILE_SIZE, player.gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    p.fill(220);
    p.noStroke();
    p.rect(
        player.gridX * TILE_SIZE,
        player.gridY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
    );
    // ─────────────────────────────────────────────────────────────────────────
}
