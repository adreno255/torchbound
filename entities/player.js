// ============================================================
// entities/player.js
// Player creation, grid movement, smooth rendering, damage, and
// the sprite animation state machine.
//
// ── SPRITE SHEET  (assets/sprites/player-v2.png) ─────────────
//   Dimensions  : 192 × 1024 px  (6 cols × 32 rows, each frame 32×32 px)
//   Pixel format: RGBA with crispEdges rendering
//
//   Row index formula:  sheetRow = stateRowBase + dirOffset
//
//   dirOffset  :  S=0  N=1  E=2  W=3
//
//   stateRowBase | state      | frames | ms/frame | loops?
//   -------------|------------|--------|----------|-------
//    0           | IDLE       |   4    |   400    | yes
//    4           | WALK       |   6    |   150    | yes
//    8           | DIM_IDLE   |   4    |   400    | yes   (darkness variant)
//   12           | DIM_WALK   |   6    |   150    | yes   (darkness variant)
//   16           | HIT        |   4    |    80    | no
//   20           | FALL       |   5    |   160    | no
//   24           | EXTINGUISH |   4    |   200    | no
//   28           | DEAD       |   4    |   200    | no
//
// ── SMOOTH MOVEMENT ──────────────────────────────────────────
//   gridX / gridY   — logical tile position; all game logic reads these.
//   renderX/renderY — pixel-space floats that exponentially lerp toward
//                     (gridX * TILE_SIZE, gridY * TILE_SIZE) each frame.
//   drawPlayer() draws at renderX/renderY to produce smooth glide.
//   findStartTile() snaps renderX/renderY to avoid a slide from (0,0).
// ============================================================

import { TILE_SIZE, MOVE_DELAY_MS } from '../common/constants.js';

const T = TILE_SIZE; // 32 — shorthand used throughout

/**
 * Exponential-decay lerp speed.
 * Fraction of the remaining distance closed per millisecond.
 * Larger = snappier; smaller = floatier.
 */
const MOVE_LERP = 0.018;

// ── Animation state definitions ───────────────────────────────────────────

/**
 * Animation configuration for each player state.
 * - row         : base row in the spritesheet (before direction offset)
 * - frames      : total animation frames in this state
 * - msPerFrame  : milliseconds displayed per frame
 * - loop        : true = loops indefinitely; false = holds on last frame
 *
 * @type {Record<string, { row: number, frames: number, msPerFrame: number, loop: boolean }>}
 */
export const ANIM_STATE = {
    IDLE: { row: 0, frames: 4, msPerFrame: 400, loop: true },
    WALK: { row: 4, frames: 6, msPerFrame: 150, loop: true },
    DIM_IDLE: { row: 8, frames: 4, msPerFrame: 400, loop: true },
    DIM_WALK: { row: 12, frames: 6, msPerFrame: 150, loop: true },
    HIT: { row: 16, frames: 4, msPerFrame: 80, loop: false },
    FALL: { row: 20, frames: 5, msPerFrame: 160, loop: false },
    EXTINGUISH: { row: 24, frames: 4, msPerFrame: 200, loop: false },
    DEAD: { row: 28, frames: 4, msPerFrame: 200, loop: false },
};

/** Spritesheet column offset per facing direction. */
const DIR_OFFSET = { S: 0, N: 1, E: 2, W: 3 };

// ── Player factory ────────────────────────────────────────────────────────

/**
 * Creates and returns a fresh player object with default values.
 * Call this whenever a new level or retry is started.
 * findStartTile() must be called immediately after to set gridX/gridY
 * and snap the render position.
 *
 * @returns {{
 *   gridX: null, gridY: null,
 *   hp: number, maxHp: number,
 *   renderX: null, renderY: null,
 *   animState: string, animFrame: number,
 *   animTimer: number, dir: string, animDone: boolean
 * }}
 */
export function createPlayer() {
    return {
        gridX: null,
        gridY: null,
        hp: 100,
        maxHp: 100,
        // Smooth render position in pixel space.
        // null → "snap to grid on first draw, don't lerp from (0,0)".
        renderX: null,
        renderY: null,
        // Animation state machine fields
        animState: 'IDLE',
        animFrame: 0,
        animTimer: 0,
        dir: 'S', // current facing direction: S | N | E | W
        animDone: false, // true once a non-looping animation reaches its last frame
    };
}

// ── Tile utilities ────────────────────────────────────────────────────────

/**
 * Scans the maze for the start tile (value 2), sets the player's logical
 * grid position, and SNAPS renderX/renderY to the same pixel position.
 *
 * Snapping is critical — without it the player would visually slide from
 * (0,0) to the actual start tile on the first few frames after a level load.
 *
 * @param {object}     player
 * @param {number[][]} maze
 * @param {number}     gridRows
 * @param {number}     gridColumns
 * @param {boolean}    [isDark=false] - if true, spawns in DIM_IDLE state
 */
export function findStartTile(
    player,
    maze,
    gridRows,
    gridColumns,
    isDark = false,
) {
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridColumns; x++) {
            if (maze[y][x] === 2 /* TILE_MAP.start */) {
                player.gridX = x;
                player.gridY = y;
                player.renderX = x * T;
                player.renderY = y * T;
                player.animState = isDark ? 'DIM_IDLE' : 'IDLE';
                player.dir = 'S';
                return;
            }
        }
    }
}

/**
 * Returns true if the tile at (x, y) can be walked on.
 * Out-of-bounds coordinates are treated as impassable walls.
 *
 * @param {number}     x
 * @param {number}     y
 * @param {number[][]} maze
 * @param {number}     gridRows
 * @param {number}     gridColumns
 * @returns {boolean}
 */
export function isWalkable(x, y, maze, gridRows, gridColumns) {
    if (x < 0 || y < 0 || x >= gridColumns || y >= gridRows) return false;
    return maze[y][x] !== 1;
}

// ── Movement ──────────────────────────────────────────────────────────────

/**
 * Reads keyboard input and, if a move is legal, updates the player's
 * logical grid position immediately.
 *
 * Movement is rate-limited by MOVE_DELAY_MS: moveTimer accumulates dt
 * each frame and a step is only allowed once it exceeds the threshold.
 * The timer resets to 0 on a successful step.
 *
 * The isDark flag switches locomotion states between the normal pair
 * (IDLE/WALK) and the dim pair (DIM_IDLE/DIM_WALK) without changing
 * any other behaviour.
 *
 * Locked states (FALL, EXTINGUISH, DEAD) block movement entirely until
 * the animation finishes (animDone = true).
 *
 * renderX/renderY are NOT changed here — they smoothly follow in
 * updateRenderPos() which runs every draw tick.
 *
 * @param {object}     p              - p5 instance (for keyIsDown)
 * @param {object}     player
 * @param {number}     moveTimer      - accumulated ms since last move
 * @param {number[][]} maze
 * @param {number}     gridRows
 * @param {number}     gridColumns
 * @param {boolean}    [isDark=false] - true when the darkness effect is active
 * @returns {number} updated moveTimer (0 on successful step, unchanged otherwise)
 */
export function movePlayer(
    p,
    player,
    moveTimer,
    maze,
    gridRows,
    gridColumns,
    isDark = false,
) {
    // Locked non-looping animations block movement until they complete
    if (!player.animDone && isLocked(player.animState)) return moveTimer;
    if (moveTimer < MOVE_DELAY_MS) return moveTimer;

    const idleState = isDark ? 'DIM_IDLE' : 'IDLE';
    const walkState = isDark ? 'DIM_WALK' : 'WALK';

    let dx = 0,
        dy = 0;

    if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) {
        dy = -1;
        player.dir = 'N';
    } else if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) {
        dy = 1;
        player.dir = 'S';
    } else if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) {
        dx = -1;
        player.dir = 'W';
    } else if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) {
        dx = 1;
        player.dir = 'E';
    } else {
        // No key held — ensure the correct idle state is active
        const currentIsWalk =
            player.animState === 'WALK' || player.animState === 'DIM_WALK';
        const currentIsIdle =
            player.animState === 'IDLE' || player.animState === 'DIM_IDLE';
        if (
            currentIsWalk ||
            (currentIsIdle && player.animState !== idleState)
        ) {
            setAnim(player, idleState);
        }
        return moveTimer;
    }

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

    setAnim(player, walkState);
    return 0; // reset move timer
}

// ── Smooth position lerp ──────────────────────────────────────────────────

/**
 * Exponentially lerps renderX/renderY toward the logical grid position.
 *
 * Formula: remaining = remaining * (1 - MOVE_LERP)^dt
 * This is frame-rate-independent — the same lerp speed regardless of dt.
 * Positions snap to the target once the error is below 0.5 px to prevent
 * infinite sub-pixel drift.
 *
 * Must be called every draw() tick with the capped delta time.
 * Handles null render positions on first spawn by snapping immediately.
 *
 * @param {object} player
 * @param {number} dt - capped delta time in ms
 */
export function updateRenderPos(player, dt) {
    if (player.renderX === null || player.renderY === null) {
        // Snap on first frame — no lerp artefact from (0,0)
        player.renderX = (player.gridX ?? 0) * T;
        player.renderY = (player.gridY ?? 0) * T;
        return;
    }

    const targetX = player.gridX * T;
    const targetY = player.gridY * T;

    const factor = Math.pow(1 - MOVE_LERP, dt);
    const newX = targetX + (player.renderX - targetX) * factor;
    const newY = targetY + (player.renderY - targetY) * factor;

    // Snap to target once close enough to avoid perpetual micro-movement
    player.renderX = Math.abs(newX - targetX) < 0.5 ? targetX : newX;
    player.renderY = Math.abs(newY - targetY) < 0.5 ? targetY : newY;
}

// ── Animation helpers ─────────────────────────────────────────────────────

/**
 * Returns true for animation states that must complete before the player
 * can move again.  These states are non-looping and control game events.
 *
 * @param {string} state
 * @returns {boolean}
 */
function isLocked(state) {
    return state === 'FALL' || state === 'EXTINGUISH' || state === 'DEAD';
}

/**
 * Transitions the player to a new animation state.
 * Resets the frame counter and timer unless the state is already active
 * (prevents restart-on-every-tick bugs).
 *
 * @param {object}  player
 * @param {string}  state        - key from ANIM_STATE
 * @param {boolean} [forceRestart=false] - if true, restarts even if already in this state
 */
export function setAnim(player, state, forceRestart = false) {
    if (player.animState === state && !forceRestart) return;
    player.animState = state;
    player.animFrame = 0;
    player.animTimer = 0;
    player.animDone = false;
}

/**
 * Advances the animation timer and updates animFrame.
 * Non-looping animations hold on their last frame and set animDone = true.
 * Looping animations wrap back to frame 0.
 *
 * @param {object} player
 * @param {number} dt - delta time in ms
 */
export function updateAnim(player, dt) {
    const cfg = ANIM_STATE[player.animState];
    if (!cfg) return;

    player.animTimer += dt;
    if (player.animTimer >= cfg.msPerFrame) {
        player.animTimer -= cfg.msPerFrame;
        const next = player.animFrame + 1;
        if (next >= cfg.frames) {
            if (cfg.loop) {
                player.animFrame = 0;
            } else {
                player.animFrame = cfg.frames - 1;
                player.animDone = true;
            }
        } else {
            player.animFrame = next;
        }
    }
}

// ── Damage & trigger helpers ──────────────────────────────────────────────

/**
 * Applies damage to the player and transitions to the appropriate
 * animation state (HIT or DEAD).
 *
 * @param {object} player
 * @param {number} amount - HP to subtract
 * @returns {boolean} true if the player just died (hp reached 0)
 */
export function takeDamage(player, amount) {
    player.hp = Math.max(0, Math.min(player.maxHp, player.hp - amount));
    if (player.hp <= 0) {
        setAnim(player, 'DEAD', true);
        return true;
    }
    setAnim(player, 'HIT', true);
    return false;
}

/**
 * Forces a HIT animation (e.g. from trap contact without lethal damage).
 * No-ops if the player is already dead.
 *
 * @param {object} player
 */
export function triggerHitAnim(player) {
    if (player.animState !== 'DEAD') setAnim(player, 'HIT', true);
}

/**
 * Forces a FALL animation (triggered by a pit trap).
 * No-ops if the player is already dead.
 *
 * @param {object} player
 */
export function triggerFallAnim(player) {
    if (player.animState !== 'DEAD') setAnim(player, 'FALL', true);
}

/**
 * Switches to the DIM variant of the current locomotion state.
 * Called once when a darkness trap fires (edge-triggered, not every tick).
 * No-ops for terminal states (DEAD, EXTINGUISH).
 *
 * @param {object} player
 */
export function triggerDimAnim(player) {
    if (player.animState === 'DEAD' || player.animState === 'EXTINGUISH')
        return;
    const isMoving =
        player.animState === 'WALK' || player.animState === 'DIM_WALK';
    setAnim(player, isMoving ? 'DIM_WALK' : 'DIM_IDLE', false);
}

/**
 * Forces an EXTINGUISH animation (torch burned out / time-up sequence).
 * No-ops if the player is already dead.
 *
 * @param {object} player
 */
export function triggerExtinguishAnim(player) {
    if (player.animState !== 'DEAD') setAnim(player, 'EXTINGUISH', true);
}

// ── Rendering ─────────────────────────────────────────────────────────────

/**
 * Advances animation, updates the smooth render position, then draws
 * the player sprite at (renderX, renderY) in world space.
 *
 * This function is the single draw call for the player — it must be
 * called once per frame inside the world transform (after applyCamera).
 *
 * Falls back to a colour-coded rectangle + direction dot when the
 * spritesheet image hasn't loaded.
 *
 * @param {object}        p         - p5 instance
 * @param {object}        player
 * @param {p5.Image|null} playerImg - preloaded spritesheet; null = fallback rect
 * @param {number}        [dt=16]   - capped delta time in ms
 */
export function drawPlayer(p, player, playerImg, dt = 16) {
    updateAnim(player, dt);
    updateRenderPos(player, dt);

    const dx = player.renderX;
    const dy = player.renderY;

    if (playerImg) {
        const cfg = ANIM_STATE[player.animState];
        const dirOffset = DIR_OFFSET[player.dir] ?? 0;
        const sheetRow = cfg.row + dirOffset;
        const sx = player.animFrame * T; // source X in spritesheet
        const sy = sheetRow * T; // source Y in spritesheet

        p.noTint();
        p.image(playerImg, dx, dy, T, T, sx, sy, T, T);
    } else {
        // ── Fallback: coloured rect with direction dot ─────────────────
        const FALLBACK_COLORS = {
            IDLE: [220, 220, 220],
            WALK: [200, 240, 200],
            DIM_IDLE: [120, 120, 140],
            DIM_WALK: [100, 120, 140],
            HIT: [255, 100, 100],
            FALL: [180, 80, 220],
            EXTINGUISH: [60, 60, 80],
            DEAD: [80, 80, 120],
        };
        const [r, g, b] = FALLBACK_COLORS[player.animState] ?? [220, 220, 220];
        p.fill(r, g, b);
        p.noStroke();
        p.rect(dx, dy, T, T);

        // Small dot indicates facing direction
        const dotOffset = {
            S: [T / 2, T - 4],
            N: [T / 2, 4],
            E: [T - 4, T / 2],
            W: [4, T / 2],
        };
        const [ox, oy] = dotOffset[player.dir] ?? [T / 2, T / 2];
        p.fill(0, 0, 0, 180);
        p.ellipse(dx + ox, dy + oy, 4, 4);
    }
}
