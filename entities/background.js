// ============================================================
// entities/background.js
// Draws a scrolling, tilted brick-wall background for all screens.
//
// Uses tile row 2, col 4 from each tileset (a clean seamless brick).
// The tile is rendered at DISPLAY_TILE_SIZE (zoomed up from source 32px)
// so bricks appear large and chunky on screen.
//
// Tileset selection:
//   Menu / non-playing screens → driven by maxUnlockedLevel
//     levels 1-2  → map-light   (grey stone)
//     levels 3-4  → map-dark    (dark slate)
//     level  5    → map-dark-v2 (deep brown)
//
//   Playing / Paused → caller passes the explicit key matching the
//     current level's tileset (so level 1 always shows map-light bricks
//     even if the player has unlocked level 5).
// ============================================================

import { TILE_SIZE } from '../common/constants.js';

// Source tile: row 2, col 4 in the 32×32 tileset
const WALL_SRC_X = TILE_SIZE * 4; // col 4
const WALL_SRC_Y = TILE_SIZE * 2; // row 2

// Display size — how large each tile is drawn on screen (zoom factor)
// 3× the source 32px = 96px tiles: big, chunky, clearly readable bricks
const DISPLAY_TILE_SIZE = TILE_SIZE * 3; // 96px

// Tilt angle in degrees
const TILT_DEG = 12;

// Scroll speed: display-px per millisecond
const SCROLL_SPEED = 0.04; // ~40 display-px / sec — gentle drift

// Overlay darkness — higher = more contrast for UI readability
const OVERLAY_ALPHA = 160;

/**
 * Returns which bgTileset key to use based on the highest unlocked level.
 * Used for menu/non-playing screens.
 *
 * @param {number} maxUnlockedLevel
 * @returns {'light'|'dark'|'darkv2'}
 */
export function bgTilesetKey(maxUnlockedLevel) {
    if (maxUnlockedLevel >= 5) return 'darkv2';
    if (maxUnlockedLevel >= 3) return 'dark';
    return 'light';
}

/**
 * Returns which bgTileset key to use for the currently playing level.
 * This is independent of what the player has unlocked — it matches the
 * actual tileset the level uses so the bg always fits the level's look.
 *
 *   level 1-2 → 'light'
 *   level 3-4 → 'dark'
 *   level 5   → 'darkv2'
 *
 * @param {number} level - current level number (1-5)
 * @returns {'light'|'dark'|'darkv2'}
 */
export function bgTilesetKeyForLevel(level) {
    if (level >= 5) return 'darkv2';
    if (level >= 3) return 'dark';
    return 'light';
}

/**
 * Draws the scrolling tilted brick background.
 * Call at the very start of draw() before any other rendering.
 *
 * @param {object} p
 * @param {object} params
 * @param {number}   params.scrollOffset    - p.millis() or equivalent
 * @param {string}   params.tilesetKey      - 'light' | 'dark' | 'darkv2'
 *                                            (caller decides; use bgTilesetKey or
 *                                             bgTilesetKeyForLevel depending on context)
 * @param {object}   params.tilesets        - { light, dark, darkv2 } p5.Image objects
 */
export function drawBackground(p, { scrollOffset, tilesetKey, tilesets }) {
    const key = tilesetKey ?? 'light';
    const tileset = tilesets[key];

    p.push();
    p.noStroke();

    // Solid base colour — prevents flash while images load
    const baseColors = {
        light: [35, 28, 30],
        dark: [10, 8, 13],
        darkv2: [18, 9, 3],
    };
    const [br, bg_, bb] = baseColors[key] ?? baseColors.light;
    p.background(br, bg_, bb);

    if (tileset) {
        const D = DISPLAY_TILE_SIZE;
        const tiltRad = (TILT_DEG * Math.PI) / 180;

        // Scroll wraps every D pixels
        const scrollX = (scrollOffset * SCROLL_SPEED) % D;

        // Grid must cover the full screen diagonal after rotation
        const diag = Math.ceil(
            Math.sqrt(p.width * p.width + p.height * p.height),
        );
        const gridSize = Math.ceil(diag / D + 4) * D;

        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.rotate(tiltRad);
        p.translate(-gridSize / 2 + scrollX, -gridSize / 2);

        const cols = Math.ceil(gridSize / D) + 2;
        const rows = Math.ceil(gridSize / D) + 2;

        p.imageMode(p.CORNER);
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                p.image(
                    tileset,
                    col * D,
                    row * D, // destination: display position & size
                    D,
                    D,
                    WALL_SRC_X,
                    WALL_SRC_Y, // source: fixed tile in sheet
                    TILE_SIZE,
                    TILE_SIZE,
                );
            }
        }
        p.pop();
    }

    // Dark overlay for contrast
    p.fill(0, 0, 0, OVERLAY_ALPHA);
    p.rect(0, 0, p.width, p.height);

    p.pop();
}
