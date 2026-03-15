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
 * Returns the source { sx, sy } in traps.png for a given trap tile
 * at the current trapTimer value.
 *
 * @param {number} tileId   — TILE_MAP.fireTrap / resetTrap / darknessTrap
 * @param {number} trapTimer — global ms elapsed (from main.js state)
 * @param {boolean} active  — whether the trap is currently in its active phase
 * @returns {{ sx: number, sy: number }}
 */
export function trapFrameSrc(tileId, trapTimer, active) {
    const cfg = TRAP_ANIM[tileId];
    if (!cfg) return { sx: 0, sy: 0 };

    let col;
    if (active) {
        const frameIndex =
            Math.floor(trapTimer / cfg.activeMsPerFrame) % cfg.activeFrames;
        col = frameIndex;
    } else {
        const frameIndex =
            Math.floor(trapTimer / cfg.inactiveMsPerFrame) % cfg.inactiveFrames;
        col = cfg.activeFrames + frameIndex;
    }

    return { sx: col * T, sy: cfg.row * T };
}

// ── Overlay colors ────────────────────────────────────────────────────────
const OVR = {
    fireTrapActive: [200, 80, 50, 200],
    fireTrapInactive: [80, 40, 30, 130],
    resetTrapActive: [150, 0, 255, 200],
    resetTrapInactive: [60, 20, 100, 130],
    darknessTrapActive: [10, 10, 10, 230],
    darknessTrapInactive: [30, 20, 50, 130],
    timePowerUp: [255, 255, 0, 190],
    torchPowerUp: [255, 150, 0, 190],
    visionPowerUp: [0, 255, 255, 190],
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
        tilesetImg,
        trapSheetImg,
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

            // Special tile overlays
            switch (tile) {
                case TILE_MAP.start:
                    drawOverlay(p, x, y, OVR.start);
                    break;
                case TILE_MAP.exit:
                    drawOverlay(p, x, y, OVR.exit);
                    break;
                case TILE_MAP.timePowerUp:
                    drawOverlay(p, x, y, OVR.timePowerUp);
                    p.fill(0, 0, 0, 150);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(T * 0.55);
                    p.text('⏱', dx + T / 2, dy + T / 2);
                    break;
                case TILE_MAP.torchPowerUp:
                    drawOverlay(p, x, y, OVR.torchPowerUp);
                    p.fill(0, 0, 0, 150);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(T * 0.55);
                    p.text('🕯', dx + T / 2, dy + T / 2);
                    break;
                case TILE_MAP.visionPowerUp:
                    drawOverlay(p, x, y, OVR.visionPowerUp);
                    p.fill(0, 0, 0, 150);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(T * 0.55);
                    p.text('👁', dx + T / 2, dy + T / 2);
                    break;
                case TILE_MAP.spentTime:
                    p.fill(
                        OVR.timePowerUp[0],
                        OVR.timePowerUp[1],
                        OVR.timePowerUp[2],
                        120,
                    );
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(T * 0.5);
                    p.text('⏱', dx + T / 2, dy + T / 2);
                    break;
                case TILE_MAP.spentTorch:
                    p.fill(
                        OVR.torchPowerUp[0],
                        OVR.torchPowerUp[1],
                        OVR.torchPowerUp[2],
                        120,
                    );
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(T * 0.5);
                    p.text('🕯', dx + T / 2, dy + T / 2);
                    break;
                case TILE_MAP.spentVision:
                    p.fill(
                        OVR.visionPowerUp[0],
                        OVR.visionPowerUp[1],
                        OVR.visionPowerUp[2],
                        120,
                    );
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(T * 0.5);
                    p.text('👁', dx + T / 2, dy + T / 2);
                    break;
                default:
                    // ── Animated trap sprites ─────────────────────────────
                    if (TRAPS[tile]) {
                        const active = isTrapActiveFn(tile, x, y);
                        if (trapSheetImg) {
                            // Draw frame from spritesheet
                            const src = trapFrameSrc(tile, trapTimer, active);
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
                            // Fallback: plain colored rect (no spritesheet loaded)
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
