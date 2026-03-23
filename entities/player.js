// ============================================================
// entities/player.js
// Player creation, grid movement, collision, damage, and
// sprite animation state machine.
//
// SPRITE SHEET: assets/sprites/player-v2.png
//   — 32×32px frames, RGBA, crispEdges
//   — Sheet is 6 cols × 32 rows (192×1024px)
//
// Row index = dirOffset + stateRowBase
//   dirOffset: S=0, N=1, E=2, W=3
//
// stateRowBase | state      | frames | ms/frame | loop
// -------------|------------|--------|----------|------
//  0           | idle       |   4    |  400     | yes
//  4           | walk       |   6    |  150     | yes
//  8           | dim_idle   |   4    |  400     | yes
// 12           | dim_walk   |   6    |  150     | yes
// 16           | hit        |   4    |   80     | no
// 20           | fall       |   5    |  160     | no
// 24           | extinguish |   4    |  200     | no
// 28           | dead       |   4    |  200     | no
//
// SMOOTH MOVEMENT
// gridX / gridY   — logical tile position used by all game logic
// renderX/renderY — pixel-space floats that exponentially lerp toward
//   the logical target each frame. drawPlayer() draws at renderX/renderY.
//   findStartTile() snaps them to avoid a slide from the old position.
// ============================================================

import { TILE_SIZE, MOVE_DELAY_MS } from '../common/constants.js';

const T = TILE_SIZE; // 32

/**
 * Exponential-decay lerp speed — fraction of remaining distance
 * closed per millisecond.
 */
const MOVE_LERP = 0.018;

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

const DIR_OFFSET = { S: 0, N: 1, E: 2, W: 3 };

// ── Player factory ────────────────────────────────────────────────────────

export function createPlayer() {
    return {
        gridX: null,
        gridY: null,
        hp: 100,
        maxHp: 100,
        // Smooth render position (pixel space, floats).
        // null means "snap to grid on first draw — don't slide from nowhere".
        renderX: null,
        renderY: null,
        // Animation
        animState: 'IDLE',
        animFrame: 0,
        animTimer: 0,
        dir: 'S',
        animDone: false,
    };
}

// ── Tile utilities ────────────────────────────────────────────────────────

/**
 * Scans the maze for the start tile, sets logical position,
 * and SNAPS renderX/renderY so there is no lerp artefact on spawn/reset.
 */
export function findStartTile(player, maze, gridRows, gridColumns) {
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridColumns; x++) {
            if (maze[y][x] === 2 /* TILE_MAP.start */) {
                player.gridX = x;
                player.gridY = y;
                player.renderX = x * T;
                player.renderY = y * T;
                player.animState = 'IDLE';
                player.dir = 'S';
                return;
            }
        }
    }
}

export function isWalkable(x, y, maze, gridRows, gridColumns) {
    if (x < 0 || y < 0 || x >= gridColumns || y >= gridRows) return false;
    return maze[y][x] !== 1;
}

// ── Movement ──────────────────────────────────────────────────────────────

/**
 * Updates the logical grid position immediately on a valid move.
 * renderX/renderY are NOT touched here — they slide toward the new
 * target in updateRenderPos() which is called every draw tick.
 *
 * Respects the dim states — movement switches between DIM_IDLE/DIM_WALK
 * instead of IDLE/WALK when darkness is active. The isDark flag is
 * forwarded from main.js each frame.
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
        // No key held — ensure we're in the correct idle state
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
    return 0;
}

// ── Smooth position lerp ──────────────────────────────────────────────────

/**
 * Exponentially lerps renderX/renderY toward the logical grid position.
 * Must be called every draw() tick with the capped delta time.
 */
export function updateRenderPos(player, dt) {
    if (player.renderX === null || player.renderY === null) {
        player.renderX = (player.gridX ?? 0) * T;
        player.renderY = (player.gridY ?? 0) * T;
        return;
    }

    const targetX = player.gridX * T;
    const targetY = player.gridY * T;

    const factor = Math.pow(1 - MOVE_LERP, dt);
    const newX = targetX + (player.renderX - targetX) * factor;
    const newY = targetY + (player.renderY - targetY) * factor;

    player.renderX = Math.abs(newX - targetX) < 0.5 ? targetX : newX;
    player.renderY = Math.abs(newY - targetY) < 0.5 ? targetY : newY;
}

// ── Animation helpers ─────────────────────────────────────────────────────

function isLocked(state) {
    return state === 'FALL' || state === 'EXTINGUISH' || state === 'DEAD';
}

export function setAnim(player, state, forceRestart = false) {
    if (player.animState === state && !forceRestart) return;
    player.animState = state;
    player.animFrame = 0;
    player.animTimer = 0;
    player.animDone = false;
}

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

// ── Damage & triggers ─────────────────────────────────────────────────────

export function takeDamage(player, amount) {
    player.hp = Math.max(0, Math.min(player.maxHp, player.hp - amount));
    if (player.hp <= 0) {
        setAnim(player, 'DEAD', true);
        return true;
    }
    setAnim(player, 'HIT', true);
    return false;
}

export function triggerHitAnim(player) {
    if (player.animState !== 'DEAD') setAnim(player, 'HIT', true);
}

export function triggerFallAnim(player) {
    if (player.animState !== 'DEAD') setAnim(player, 'FALL', true);
}

export function triggerDimAnim(player) {
    // Switches to the dim variant of whichever locomotion state is active.
    // DIM_IDLE and DIM_WALK are handled by movePlayer each frame;
    // this triggers the initial switch when the darkness trap fires.
    if (player.animState === 'DEAD' || player.animState === 'EXTINGUISH')
        return;
    const isMoving =
        player.animState === 'WALK' || player.animState === 'DIM_WALK';
    setAnim(player, isMoving ? 'DIM_WALK' : 'DIM_IDLE', false);
}

export function triggerExtinguishAnim(player) {
    if (player.animState !== 'DEAD') setAnim(player, 'EXTINGUISH', true);
}

// ── Rendering ─────────────────────────────────────────────────────────────

/**
 * Advances animation, updates smooth render position, then draws the player.
 *
 * @param {object}   p         - p5 instance
 * @param {object}   player
 * @param {p5.Image} playerImg - preloaded spritesheet (null = fallback rect)
 * @param {number}   dt        - capped delta time in ms
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
        const sx = player.animFrame * T;
        const sy = sheetRow * T;

        p.noTint();
        p.image(playerImg, dx, dy, T, T, sx, sy, T, T);
    } else {
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
