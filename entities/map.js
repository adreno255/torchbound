// ============================================================
// entities/map.js
// Draws the maze using torchbound_tileset.png (160×224px).
// All tiles are native 32×32px — 5 cols × 7 rows = 35 tiles.
//
// Tile notation: ROW x COL  (e.g. 3x1 = row 3, col 1)
// Source coords:  sx = col * 32,  sy = row * 32
//
// Full tile legend (ROWxCOL):
//   0x0  horiz wall       — inner; floors N+S; walls E+W
//   0x1  vert wall        — inner; floors E+W; walls N+S
//   0x2  corner           — inner; floors S+E; walls N+W
//   0x3  corner           — inner; floors S+W; walls N+E
//   0x4  corner           — inner; floors N+E; walls S+W
//   1x0  corner           — inner; floors N+W; walls S+E
//   1x1  edge wall        — edge;  floor N; walls E+W; boundary S
//   1x2  edge wall        — edge;  floor S; walls E+W; boundary N
//   1x3  edge wall        — edge;  floor W; walls N+S; boundary E
//   1x4  edge wall        — edge;  floor E; walls N+S; boundary W
//   2x0  T-wall           — inner; floors N+E+W; wall S
//   2x1  T-wall           — inner; floors E+S+W; wall N
//   2x2  T-wall           — inner; floors N+W+S; wall E
//   2x3  T-wall           — inner; floors N+E+S; wall W
//   2x4  solid (unused)
//   3x0  solid            — inner; walls N+E+S+W; no floors
//   3x1  edge corner (unused)
//   3x2  edge corner      — edge;  walls N+E; boundaries S+W
//   3x3  edge corner (unused)
//   3x4  edge corner      — edge;  walls S+W; boundaries N+E
//   4x0  edge wall        — edge;  walls E+S+W; boundary N
//   4x1  edge wall        — edge;  walls N+E+W; boundary S
//   4x2  edge wall        — edge;  walls N+W+S; boundary E
//   4x3  edge wall        — edge;  walls N+E+S; boundary W
//   4x4  T-wall           — inner; floor N; walls E+S+W
//   5x0  T-wall           — inner; floor S; walls N+E+W
//   5x1  T-wall           — inner; floor W; walls N+E+S
//   5x2  T-wall           — inner; floor E; walls N+S+W
//   5x3  edge corner      — edge;  floors N+E; wall S; boundary W
//   5x4  edge corner      — edge;  floors S+W; wall N; boundary E
//   6x0  floor            — no wall above
//   6x1  floor shadow     — wall above (no left/right context)
//   6x2  floor shadow     — wall above continues LEFT
//   6x3  floor shadow     — wall above continues RIGHT
//   6x4  floor shadow     — wall above is isolated
//
// Wall tile selection requires knowing BOTH the bitmask (which neighbors
// are walls, treating boundary as wall) AND which neighbors are boundaries.
// Tiles 1x1–1x4, 4x4–5x2, 5x3–5x4 share the same bitmask but differ by
// whether one of the wall neighbors is a true boundary vs interior wall.
// ============================================================

import { TILE_SIZE, TILE_MAP, TRAPS, GAME_PHASE } from '../common/constants.js';

const T = TILE_SIZE; // 32

// ── Source coord helper ───────────────────────────────────────────────────
const rc = (row, col) => ({ sx: col * T, sy: row * T });

// ── All tile sources by name ──────────────────────────────────────────────
const TILES = {
    // Inner wall tiles
    horiz: rc(0, 0), // floors N+S,  walls E+W
    vert: rc(0, 1), // floors E+W,  walls N+S
    c_se: rc(0, 2), // floors S+E,  walls N+W   (corner, brick mass NW)
    c_sw: rc(0, 3), // floors S+W,  walls N+E   (corner, brick mass NE)
    c_ne: rc(0, 4), // floors N+E,  walls S+W   (corner, brick mass SW)
    c_nw: rc(1, 0), // floors N+W,  walls S+E   (corner, brick mass SE)
    t_s: rc(2, 0), // floors N+E+W, wall S     (T-wall open to S)
    t_n: rc(2, 1), // floors E+S+W, wall N     (T-wall open to N)
    t_e: rc(2, 2), // floors N+W+S, wall E     (T-wall open to E)
    t_w: rc(2, 3), // floors N+E+S, wall W     (T-wall open to W)
    solid: rc(3, 0), // no floors, walls all sides (inner)
    tt_n: rc(4, 4), // floor N,  walls E+S+W    (inner T, open north)
    tt_s: rc(5, 0), // floor S,  walls N+E+W    (inner T, open south)
    tt_w: rc(5, 1), // floor W,  walls N+E+S    (inner T, open west)
    tt_e: rc(5, 2), // floor E,  walls N+S+W    (inner T, open east)

    // Edge wall tiles (one side is maze boundary)
    edge_n: rc(1, 1), // floor N,  walls E+W,  boundary S
    edge_s: rc(1, 2), // floor S,  walls E+W,  boundary N
    edge_w: rc(1, 3), // floor W,  walls N+S,  boundary E
    edge_e: rc(1, 4), // floor E,  walls N+S,  boundary W
    edge_nw: rc(3, 4), // walls N+E, boundaries S+W
    edge_sw: rc(3, 2), // walls S+W, boundaries N+E
    ec_nw: rc(3, 1), // floor N, walls E+S, boundary W  (left-edge top-open)
    ec_se: rc(3, 3), // floor S, walls N+W, boundary E  (right-edge bot-open)
    edge_top: rc(4, 0), // walls E+S+W, boundary N
    edge_bot: rc(4, 1), // walls N+E+W, boundary S
    edge_rgt: rc(4, 2), // walls N+W+S, boundary E
    edge_lft: rc(4, 3), // walls N+E+S, boundary W
    ec_ne: rc(5, 3), // floors N+E, wall S, boundary W
    ec_sw: rc(5, 4), // floors S+W, wall N, boundary E

    // Floor tiles
    floor: rc(6, 0), // no wall above
    fl_shadow: rc(6, 1), // wall above, both sides continue
    fl_shad_r: rc(6, 2), // wall above continues right
    fl_shad_l: rc(6, 3), // wall above continues left
    fl_shad_iso: rc(6, 4), // wall above, isolated

    // Special floor tiles — row 7
    start_tile: rc(7, 0), // entrance rune (top-left of maze)
    exit_tile: rc(7, 1), // exit marker  (bottom-right of maze)
};

// ── Trap animation config ─────────────────────────────────────────────────
// Each entry: { row, activeFrames, inactiveFrames, activeMsPerFrame, inactiveMsPerFrame }
const TRAP_ANIM = {
    [TILE_MAP.fireTrap]: {
        row: 0,
        activeFrames: 8,
        inactiveFrames: 4,
        activeMsPerFrame: 250, // 2000ms / 8
        inactiveMsPerFrame: 375, // 1500ms / 4
    },
    [TILE_MAP.resetTrap]: {
        row: 1,
        activeFrames: 6,
        inactiveFrames: 4,
        activeMsPerFrame: 167, // 1000ms / 6
        inactiveMsPerFrame: 500, // 2000ms / 4
    },
    [TILE_MAP.darknessTrap]: {
        row: 2,
        activeFrames: 6,
        inactiveFrames: 4,
        activeMsPerFrame: 250, // 1500ms / 6
        inactiveMsPerFrame: 375, // 1500ms / 4
    },
};

/**
 * Returns the source { sx, sy } in traps.png for a given trap tile,
 * using the same offset logic as isTrapActive() so the animation frame
 * always starts at 0 at the beginning of each phase for this specific tile.
 *
 * @param {number}  tileId    — TILE_MAP.fireTrap / resetTrap / darknessTrap
 * @param {number}  x         — tile grid column (for positional offset)
 * @param {number}  y         — tile grid row    (for positional offset)
 * @param {number}  trapTimer — global ms elapsed (from main.js state)
 * @param {boolean} active    — whether the trap is currently in its active phase
 * @returns {{ sx: number, sy: number }}
 */
export function trapFrameSrc(tileId, x, y, trapTimer, active) {
    const cfg = TRAP_ANIM[tileId];
    if (!cfg) return { sx: 0, sy: 0 };

    const trap = TRAPS[tileId];
    const cycle = trap.activeTime + trap.inactiveTime;

    // Apply the same positional offset used by isTrapActive so frame 0
    // always aligns with the start of this tile's active/inactive phase.
    const offset = trap.randomized ? (x * 777 + y * 999) % cycle : 0;
    const positionInCycle = (trapTimer + offset) % cycle;

    let col;
    if (active) {
        // positionInCycle is within [0, activeTime) — map to active frames
        const frameIndex =
            Math.floor(positionInCycle / cfg.activeMsPerFrame) %
            cfg.activeFrames;
        col = frameIndex;
    } else {
        // positionInCycle is within [activeTime, cycle) — map to inactive frames
        const positionInInactive = positionInCycle - trap.activeTime;
        const frameIndex =
            Math.floor(positionInInactive / cfg.inactiveMsPerFrame) %
            cfg.inactiveFrames;
        col = cfg.activeFrames + frameIndex;
    }

    return { sx: col * T, sy: cfg.row * T };
}

// ── Powerup animation config ──────────────────────────────────────────────
// powerups.png — 256×96px, 8 cols × 3 rows, each frame 32×32px, RGBA.
//   Row 0: Time Crystal  — cols 0-5 idle (150ms/frame), cols 6-7 spent (500ms/frame)
//   Row 1: Torch Powerup — cols 0-5 idle (150ms/frame), cols 6-7 spent (500ms/frame)
//   Row 2: Vision Orb    — cols 0-5 idle (150ms/frame), cols 6-7 spent (500ms/frame)
const POWERUP_ANIM = {
    [TILE_MAP.timePowerUp]: { row: 0 },
    [TILE_MAP.torchPowerUp]: { row: 1 },
    [TILE_MAP.visionPowerUp]: { row: 2 },
    // Spent variants (tile changes after collection)
    [TILE_MAP.spentTime]: { row: 0, spent: true },
    [TILE_MAP.spentTorch]: { row: 1, spent: true },
    [TILE_MAP.spentVision]: { row: 2, spent: true },
};

const POWERUP_IDLE_FRAMES = 6;
const POWERUP_SPENT_FRAMES = 2;
const POWERUP_IDLE_MS = 150; // per frame → 900ms full cycle
const POWERUP_SPENT_MS = 500; // per frame → 1000ms slow pulse

/**
 * Returns { sx, sy } into powerups.png for the given powerup tile
 * at the current millis() value.
 *
 * @param {number} tileId   — TILE_MAP.timePowerUp etc.
 * @param {number} millis   — p.millis() from main.js
 * @returns {{ sx: number, sy: number }}
 */
export function powerupFrameSrc(tileId, millis) {
    const cfg = POWERUP_ANIM[tileId];
    if (!cfg) return { sx: 0, sy: 0 };

    let col;
    if (cfg.spent) {
        col =
            POWERUP_IDLE_FRAMES +
            (Math.floor(millis / POWERUP_SPENT_MS) % POWERUP_SPENT_FRAMES);
    } else {
        col = Math.floor(millis / POWERUP_IDLE_MS) % POWERUP_IDLE_FRAMES;
    }

    return { sx: col * T, sy: cfg.row * T };
}

// ── Overlay colors (start / exit only) ───────────────────────────────────
const OVR = {
    start: [50, 200, 50, 170],
    exit: [50, 100, 200, 220],
};

// ── Tile picker ───────────────────────────────────────────────────────────

/**
 * Returns the correct wall tile source for a given cell.
 * Distinguishes edge tiles (boundary neighbor) from inner tiles (wall neighbor)
 * even when they share the same 4-neighbor bitmask.
 */
function wallTileSrc(maze, gridRows, gridColumns, x, y) {
    // Boundary flags — true when that neighbour is outside the maze array
    const bN = y - 1 < 0;
    const bS = y + 1 >= gridRows;
    const bE = x + 1 >= gridColumns;
    const bW = x - 1 < 0;

    // Wall flags — boundary always counts as wall
    const wN = bN || maze[y - 1][x] === TILE_MAP.wall;
    const wS = bS || maze[y + 1][x] === TILE_MAP.wall;
    const wE = bE || maze[y][x + 1] === TILE_MAP.wall;
    const wW = bW || maze[y][x - 1] === TILE_MAP.wall;

    const mask = (wN ? 1 : 0) | (wE ? 2 : 0) | (wS ? 4 : 0) | (wW ? 8 : 0);

    switch (mask) {
        // ── All four sides walled ────────────────────────────────────────
        case 15:
            if (bN && bW) return TILES.edge_nw; // NW corner of maze
            if (bS && bW) return TILES.edge_sw; // SW corner of maze
            // bN && bE / bS && bE: use same corner tiles as fallback
            if (bN && bE) return TILES.edge_nw;
            if (bS && bE) return TILES.edge_sw;
            if (bN) return TILES.edge_top;
            if (bS) return TILES.edge_bot;
            if (bE) return TILES.edge_rgt;
            if (bW) return TILES.edge_lft;
            return TILES.solid;

        // ── Three sides walled (one floor) ──────────────────────────────
        case 14: // ESW walled, N floor
            if (bS) return TILES.edge_n; // boundary south → top edge wall
            if (bW) return TILES.ec_nw; // boundary west  → left-edge top-open (3x1)
            return TILES.tt_n;

        case 11: // NEW walled, S floor
            if (bN) return TILES.edge_s; // boundary north → bottom edge wall
            if (bE) return TILES.ec_se; // boundary east  → right-edge bot-open (3x3)
            return TILES.tt_s;

        case 7: // NES walled, W floor
            return bE ? TILES.edge_w : TILES.tt_w;

        case 13: // NSW walled, E floor
            return bW ? TILES.edge_e : TILES.tt_e;

        // ── Two opposite sides walled (two floors, thin strips) ──────────
        case 10:
            return TILES.horiz; // EW walled, NS floor
        case 5:
            return TILES.vert; // NS walled, EW floor

        // ── Two adjacent sides walled (corner) ───────────────────────────
        case 9:
            return TILES.c_se; // NW walled, SE floor
        case 3: // NE walled, SW floor
            return bE ? TILES.ec_sw : TILES.c_sw;
        case 12: // SW walled, NE floor
            return bW ? TILES.ec_ne : TILES.c_ne;
        case 6:
            return TILES.c_nw; // ES walled, NW floor

        // ── One side walled (three floors, T-junction open) ──────────────
        case 4:
            return TILES.t_s; // S walled, NEW floor
        case 1:
            return TILES.t_n; // N walled, ESW floor
        case 2:
            return TILES.t_e; // E walled, NSW floor
        case 8:
            return TILES.t_w; // W walled, NES floor

        // ── No walls (isolated) ──────────────────────────────────────────
        default:
            return TILES.t_s; // fallback: treat like open cap
    }
}

/**
 * Returns the correct floor tile source.
 * If there is a wall directly above, uses a shadow variant based on
 * whether that wall continues left and/or right.
 */
function floorTileSrc(maze, gridRows, gridColumns, x, y) {
    const wallAbove = y - 1 < 0 || maze[y - 1][x] === TILE_MAP.wall;
    if (!wallAbove) return TILES.floor;

    const wl = x - 1 >= 0 && maze[y - 1][x - 1] === TILE_MAP.wall;
    const wr = x + 1 < gridColumns && maze[y - 1][x + 1] === TILE_MAP.wall;

    if (wl && wr) return TILES.fl_shadow;
    if (wl) return TILES.fl_shad_l;
    if (wr) return TILES.fl_shad_r;
    return TILES.fl_shad_iso;
}

// ── Draw helpers ──────────────────────────────────────────────────────────

function drawTile(p, img, src, dx, dy) {
    p.image(img, dx, dy, T, T, src.sx, src.sy, T, T);
}

function drawOverlay(p, x, y, [r, g, b, a]) {
    p.fill(r, g, b, a ?? 180);
    p.noStroke();
    p.rect(x * T, y * T, T, T);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Draws the maze in two passes.
 * Pass 1: floor tiles, power-ups, and animated trap sprites.
 * Pass 2: wall tiles drawn on top.
 *
 * @param {object}   p
 * @param {object}   params
 * @param {number[][]} params.maze
 * @param {number}   params.gridRows
 * @param {number}   params.gridColumns
 * @param {function} params.isTrapActiveFn  (tileId, x, y) => boolean
 * @param {number}   params.trapTimer       ms elapsed — drives trap animation frames
 * @param {object}   [params.tilesetImg]    p5.Image — torchbound_tileset.png
 * @param {object}   [params.trapSheetImg]  p5.Image — traps.png
 */
export function drawGrid(
    p,
    {
        maze,
        gridRows,
        gridColumns,
        isTrapActiveFn,
        trapTimer,
        millis,
        tilesetImg,
        trapSheetImg,
        powerupSheetImg,
    },
) {
    p.noStroke();

    // ── Pass 1: floors ────────────────────────────────────────────────────
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridColumns; x++) {
            const tile = maze[y][x];
            if (tile === TILE_MAP.wall) continue;

            const dx = x * T;
            const dy = y * T;

            // Floor base
            if (tilesetImg) {
                drawTile(
                    p,
                    tilesetImg,
                    floorTileSrc(maze, gridRows, gridColumns, x, y),
                    dx,
                    dy,
                );
            } else {
                p.fill(58, 46, 66);
                p.rect(dx, dy, T, T);
            }

            // ── Special tiles overlaid on floor ──────────────────────────
            switch (tile) {
                case TILE_MAP.start:
                    if (tilesetImg) {
                        drawTile(p, tilesetImg, TILES.start_tile, dx, dy);
                    } else {
                        drawOverlay(p, x, y, OVR.start);
                    }
                    break;

                case TILE_MAP.exit:
                    if (tilesetImg) {
                        drawTile(p, tilesetImg, TILES.exit_tile, dx, dy);
                    } else {
                        drawOverlay(p, x, y, OVR.exit);
                    }
                    break;

                case TILE_MAP.timePowerUp:
                case TILE_MAP.torchPowerUp:
                case TILE_MAP.visionPowerUp:
                case TILE_MAP.spentTime:
                case TILE_MAP.spentTorch:
                case TILE_MAP.spentVision:
                    if (powerupSheetImg) {
                        const src = powerupFrameSrc(tile, millis);
                        p.image(
                            powerupSheetImg,
                            dx,
                            dy,
                            T,
                            T,
                            src.sx,
                            src.sy,
                            T,
                            T,
                        );
                    } else {
                        const PU_FALLBACK = {
                            [TILE_MAP.timePowerUp]: [255, 255, 0, 190],
                            [TILE_MAP.torchPowerUp]: [255, 150, 0, 190],
                            [TILE_MAP.visionPowerUp]: [0, 255, 255, 190],
                            [TILE_MAP.spentTime]: [100, 100, 0, 80],
                            [TILE_MAP.spentTorch]: [100, 60, 0, 80],
                            [TILE_MAP.spentVision]: [0, 100, 100, 80],
                        };
                        const ovr = PU_FALLBACK[tile];
                        if (ovr) drawOverlay(p, x, y, ovr);
                    }
                    break;

                case TILE_MAP.consumedPowerUp:
                    p.fill(20, 15, 25, 120);
                    p.rect(dx + 5, dy + 5, T - 10, T - 10, 3);
                    break;

                default:
                    if (TRAPS[tile]) {
                        const active = isTrapActiveFn(tile, x, y);
                        if (trapSheetImg) {
                            const src = trapFrameSrc(
                                tile,
                                x,
                                y,
                                trapTimer,
                                active,
                            );
                            p.image(
                                trapSheetImg,
                                dx,
                                dy,
                                T,
                                T,
                                src.sx,
                                src.sy,
                                T,
                                T,
                            );
                        } else {
                            const FALLBACK = {
                                [TILE_MAP.fireTrap]: active
                                    ? [200, 80, 50, 200]
                                    : [80, 40, 30, 130],
                                [TILE_MAP.resetTrap]: active
                                    ? [150, 0, 255, 200]
                                    : [60, 20, 100, 130],
                                [TILE_MAP.darknessTrap]: active
                                    ? [10, 10, 10, 230]
                                    : [30, 20, 50, 130],
                            };
                            const ovr = FALLBACK[tile];
                            if (ovr) drawOverlay(p, x, y, ovr);
                        }
                    }
                    break;
            }
        }
    }

    // ── Pass 2: walls ─────────────────────────────────────────────────────
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridColumns; x++) {
            if (maze[y][x] !== TILE_MAP.wall) continue;
            const dx = x * T;
            const dy = y * T;
            if (tilesetImg) {
                drawTile(
                    p,
                    tilesetImg,
                    wallTileSrc(maze, gridRows, gridColumns, x, y),
                    dx,
                    dy,
                );
            } else {
                p.fill(100);
                p.rect(dx, dy, T, T);
            }
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

// ── Torch glow color stops ────────────────────────────────────────────────
// Defines the warm-to-cold radial gradient for the torch fog effect.
//
// Each stop: [radiusFraction (0=center, 1=outerPx), r, g, b, alpha]
//   - Center:        warm amber-white core        — very bright, low alpha (faint overlay)
//   - Inner ring:    golden amber warmth           — the "torch halo"
//   - Mid ring:      deep amber-brown transition   — where warmth fades
//   - Outer ring:    cold near-black               — encroaching darkness
//   - Edge:          pure black, fully opaque      — complete darkness
//
// The alpha channel here controls *how much black fog* sits on top of
// the world — 0 = fully visible, 255 = pitch black.
const TORCH_GRADIENT_STOPS = [
    { t: 0.0, r: 255, g: 180, b: 80, a: 0 }, // core: warm transparent
    { t: 0.18, r: 220, g: 120, b: 30, a: 8 }, // warm amber halo
    { t: 0.38, r: 140, g: 60, b: 15, a: 60 }, // amber → brown transition
    { t: 0.58, r: 60, g: 20, b: 8, a: 140 }, // deep brown shadows
    { t: 0.75, r: 15, g: 6, b: 2, a: 210 }, // near-black
    { t: 0.88, r: 4, g: 2, b: 1, a: 245 }, // almost solid dark
    { t: 1.0, r: 0, g: 0, b: 0, a: 255 }, // pure black edge
];

/**
 * Repaints the fog layer using a smooth radial gradient torch glow.
 *
 * The effect layers two passes on the fog graphics context:
 *   1. A full black fill (complete darkness baseline)
 *   2. A canvas2D radial gradient "punched" over the player using
 *      destination-out blending to reveal the world beneath, with warm
 *      amber-to-black color stops creating the torch atmosphere.
 *
 * Uses renderX/renderY for smooth glide with the player sprite.
 *
 * @param {object}   p
 * @param {object}   fogLayer     - p5.Graphics
 * @param {object}   params
 * @param {object}   params.player
 * @param {number}   params.torchRadius   - radius in tile units (e.g. 2.5)
 * @param {number}   [params.flickerSeed] - noise seed offset for flicker (0..1 range, optional)
 */
function paintFog(p, fogLayer, { player, torchRadius, flickerSeed = 0 }) {
    const ctx = fogLayer.drawingContext;

    // Torch centre in pixel space — use renderX/renderY (smooth) with
    // a fallback to the logical grid position before the first draw tick.
    const cx = (player.renderX ?? player.gridX * TILE_SIZE) + TILE_SIZE / 2;
    const cy = (player.renderY ?? player.gridY * TILE_SIZE) + TILE_SIZE / 2;

    // Convert radius from tile units to pixels.
    // The outer radius defines the hard darkness edge.
    // A small flicker offset is applied to both radii for organic movement.
    const flickerScale = 0.06; // ±6% flicker — subtle but visible
    const flicker = 1.0 + (flickerSeed - 0.5) * 2.0 * flickerScale;

    const innerPx = Math.max(0, (torchRadius - 0.5) * TILE_SIZE * flicker);
    const outerPx = Math.max(0, (torchRadius + 1.5) * TILE_SIZE * flicker);

    // If the torch is fully extinguished, just fill pure black and return early.
    if (outerPx === 0) {
        fogLayer.clear();
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.fillRect(0, 0, fogLayer.width, fogLayer.height);
        return;
    }

    // ── Step 1: fill everything black (baseline darkness) ─────────────────
    fogLayer.clear();
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, fogLayer.width, fogLayer.height);

    // ── Step 2: punch torch glow using destination-out blend ──────────────
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerPx);

    for (const stop of TORCH_GRADIENT_STOPS) {
        const eraseAmount = 1.0 - stop.a / 255.0;
        grad.addColorStop(
            stop.t,
            `rgba(${stop.r},${stop.g},${stop.b},${eraseAmount.toFixed(3)})`,
        );
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerPx, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // ── Step 3: Warm bloom ↔ cold dark bloom crossfade ────────────────────
    // As the torch shrinks, glowPx (= innerPx * 1.8) descends toward 0.
    // Instead of a hard branch, both gradients are drawn simultaneously with
    // complementary alphas that crossfade across a TILE_SIZE-wide window,
    // giving a seamless warm-amber → cold-black transition.
    const glowPx = innerPx * 1.8;
    const FADE_WINDOW = TILE_SIZE * 1.5; // px range over which crossfade occurs
    // warmT: 1.0 at full torch, 0.0 once glowPx <= 0
    const warmT = Math.max(0, Math.min(1, glowPx / FADE_WINDOW));
    const darkT = 1.0 - warmT;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Warm amber gradient — fades out as torch shrinks
    if (warmT > 0 && glowPx > 0) {
        const warmGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowPx);
        warmGrad.addColorStop(
            0.0,
            `rgba(255, 160, 40, ${(0.18 * warmT).toFixed(3)})`,
        );
        warmGrad.addColorStop(
            0.3,
            `rgba(200, 100, 20, ${(0.1 * warmT).toFixed(3)})`,
        );
        warmGrad.addColorStop(
            0.65,
            `rgba(120,  50, 10, ${(0.04 * warmT).toFixed(3)})`,
        );
        warmGrad.addColorStop(1.0, `rgba(  0,   0,  0, 0.00)`);
        ctx.fillStyle = warmGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowPx, 0, Math.PI * 2);
        ctx.fill();
    }

    // Cold dark gradient — fades in as torch shrinks, uses outerPx as radius
    if (darkT > 0 && outerPx > 0) {
        const darkGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerPx);
        darkGrad.addColorStop(0.0, `rgba(0, 0, 0, 0.00)`);
        darkGrad.addColorStop(
            0.35,
            `rgba(2, 2, 4, ${(0.55 * darkT).toFixed(3)})`,
        );
        darkGrad.addColorStop(
            0.65,
            `rgba(1, 1, 3, ${(0.82 * darkT).toFixed(3)})`,
        );
        darkGrad.addColorStop(
            1.0,
            `rgba(0, 0, 2, ${(0.97 * darkT).toFixed(3)})`,
        );
        ctx.fillStyle = darkGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, outerPx, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
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
 * @param {number}  [params.flickerSeed]  - p.noise() value for flicker (0..1)
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
