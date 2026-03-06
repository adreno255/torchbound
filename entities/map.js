// ============================================================
// entities/map.js
// Draws the maze grid and handles the fog-of-war lighting layer.
//
// SPRITE NOTE:
// All tiles currently render as colored rectangles (placeholders).
// When sprites are ready, replace the fill+rect blocks in drawGrid()
// with p.image() calls. Suggested sprite keys:
//   sprites.wall, sprites.floor, sprites.start, sprites.exit,
//   sprites.fireTrap, sprites.resetTrap, sprites.darknessTrap,
//   sprites.timePowerUp, sprites.torchPowerUp, sprites.visionPowerUp
// ============================================================

import { TILE_SIZE, TILE_MAP, TRAPS, GAME_PHASE } from '../common/constants.js';

/**
 * Draws every tile of the maze grid using placeholder colors.
 * Replace each fill+rect block with p.image(sprites.X, ...) for sprites.
 *
 * @param {object}   p             - p5 instance
 * @param {object}   params
 * @param {number[][]} params.maze
 * @param {number}   params.gridRows
 * @param {number}   params.gridColumns
 * @param {function} params.isTrapActiveFn - (tileId, x, y) => boolean
 */
export function drawGrid(p, { maze, gridRows, gridColumns, isTrapActiveFn }) {
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridColumns; x++) {
            const tile = maze[y][x];
            p.noStroke();

            // ── PLACEHOLDER COLORS ──────────────────────────────────────────
            // TODO: Replace each block with p.image(sprites.X, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            if (tile === TILE_MAP.wall) p.fill(100);
            else if (tile === TILE_MAP.start) p.fill(50, 200, 50);
            else if (tile === TILE_MAP.exit) p.fill(50, 100, 200);
            else if (tile === TILE_MAP.floor) p.fill(20);
            else if (tile === TILE_MAP.timePowerUp)
                p.fill(255, 255, 0); // Yellow
            else if (tile === TILE_MAP.torchPowerUp)
                p.fill(255, 150, 0); // Orange
            else if (tile === TILE_MAP.visionPowerUp)
                p.fill(0, 255, 255); // Cyan
            else if (TRAPS[tile]) {
                const active = isTrapActiveFn(tile, x, y);
                if (tile === TILE_MAP.fireTrap)
                    p.fill(active ? [200, 80, 50] : 60); // Red
                else if (tile === TILE_MAP.resetTrap)
                    p.fill(active ? [150, 0, 255] : 60); // Purple
                else if (tile === TILE_MAP.darknessTrap)
                    p.fill(active ? [0, 0, 0] : 60); // Black
            }
            // ───────────────────────────────────────────────────────────────

            p.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

/**
 * Creates and returns a p5.Graphics layer sized to the full world.
 * Call once when a level is loaded.
 *
 * @param {object} p
 * @param {number} worldWidth
 * @param {number} worldHeight
 * @returns {p5.Graphics}
 */
export function createFogLayer(p, worldWidth, worldHeight) {
    const layer = p.createGraphics(worldWidth, worldHeight);
    layer.pixelDensity(1);
    layer.noSmooth();
    return layer;
}

/**
 * Repaints the fog layer based on the player's current position and torch radius.
 * Tiles within the radius are clear; tiles outside fade to black.
 *
 * @param {object}   p
 * @param {object}   fogLayer - p5.Graphics
 * @param {object}   params
 * @param {object}   params.player
 * @param {number}   params.gridRows
 * @param {number}   params.gridColumns
 * @param {number}   params.torchRadius
 */
function paintFog(p, fogLayer, { player, gridRows, gridColumns, torchRadius }) {
    fogLayer.clear();
    fogLayer.noStroke();

    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridColumns; x++) {
            const dx = x - player.gridX;
            const dy = y - player.gridY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const darkness = p.constrain(
                p.map(distance, torchRadius - 1, torchRadius + 1, 0, 255),
                0,
                255,
            );

            fogLayer.fill(0, darkness);
            fogLayer.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

/**
 * Paints and composites the fog layer onto the screen when conditions require it.
 *
 * @param {object} p
 * @param {object} fogLayer
 * @param {object} params
 * @param {boolean} params.enableFog
 * @param {boolean} params.enableCamera
 * @param {string}  params.gamePhase
 * @param {number}  params.fogOpacity   - 0 (transparent) to 255 (fully dark)
 * @param {object}  params.player
 * @param {number}  params.gridRows
 * @param {number}  params.gridColumns
 * @param {number}  params.torchRadius
 */
export function renderFog(p, fogLayer, params) {
    const { enableFog, enableCamera, gamePhase, fogOpacity } = params;
    const shouldShow =
        enableFog && (gamePhase === GAME_PHASE.PLAYING || fogOpacity > 0);

    if (shouldShow && enableCamera) {
        paintFog(p, fogLayer, params);
        p.tint(255, fogOpacity);
        p.image(fogLayer, 0, 0);
        p.noTint();
    }
}
