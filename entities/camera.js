// ============================================================
// entities/camera.js
// Camera transform: intro pan/zoom sequence and smooth follow.
//
// The camera has two display modes that are blended via transitionAlpha:
//
//   Bird's-eye (transitionAlpha = 0)
//     The entire maze fits the window.  Used during INTRO_REVEAL to
//     show the player the full layout before gameplay begins.
//     Scale = window / worldSize (letterboxed).
//
//   Follow-cam (transitionAlpha = 1)
//     The camera is locked to the player with ZOOM applied.
//     The viewport shows only a portion of the world, creating tension.
//     Scale = scaleFactor * ZOOM.
//
// During INTRO_PAN both modes are lerped so the camera smoothly
// zooms in from the full-map view to the player-centred view.
//
// Both functions are pure transforms — they do not mutate state.
// applyCamera()  modifies the p5 matrix stack (call inside push/pop).
// followPlayer() returns new camera coords; the caller stores them.
// ============================================================

import {
    BASE_WIDTH,
    BASE_HEIGHT,
    TILE_SIZE,
    ZOOM,
    CAMERA_LERP,
} from '../common/constants.js';

/**
 * Applies the camera transformation to the p5 sketch for the current frame.
 *
 * Must be called inside a p.push() / p.pop() block, before drawing any
 * world content.  All subsequent draw calls will be in world space until
 * the matching p.pop() restores the matrix.
 *
 * The transform order is:
 *   1. translate(finalTransX, finalTransY) — shift viewport origin
 *   2. scale(finalScale)                   — apply zoom
 *   3. translate(-cameraX, -cameraY)        — scroll to camera position
 *
 * When enableCamera is false (debug map mode) the world is scaled to fit
 * the entire window with no follow behaviour.
 *
 * @param {object} p - p5 instance
 * @param {object} state
 * @param {boolean} state.enableCamera     - false = bird's-eye debug mode
 * @param {number}  state.scaleFactor      - window-to-base-canvas ratio
 * @param {number}  state.worldWidth       - maze width in pixels
 * @param {number}  state.worldHeight      - maze height in pixels
 * @param {number}  state.transitionAlpha  - 0 = bird's-eye, 1 = zoomed follow
 * @param {number}  state.cameraX          - current camera X offset in world px
 * @param {number}  state.cameraY          - current camera Y offset in world px
 */
export function applyCamera(p, state) {
    const {
        enableCamera,
        scaleFactor,
        worldWidth,
        worldHeight,
        transitionAlpha,
        cameraX,
        cameraY,
    } = state;

    // ── Bird's-eye constants (full-world fit) ─────────────────────────────
    const fullWorldScale = Math.min(
        p.windowWidth / worldWidth,
        p.windowHeight / worldHeight,
    );
    const birdEyeX = (p.windowWidth - worldWidth * fullWorldScale) / 2;
    const birdEyeY = (p.windowHeight - worldHeight * fullWorldScale) / 2;

    let finalScale, finalTransX, finalTransY, finalCameraX, finalCameraY;

    if (!enableCamera) {
        // Debug mode: show the full world, no follow
        finalScale = fullWorldScale;
        finalTransX = birdEyeX;
        finalTransY = birdEyeY;
        finalCameraX = 0;
        finalCameraY = 0;
    } else {
        // ── Zoomed follow-cam constants ───────────────────────────────────
        const targetScale = scaleFactor * ZOOM;
        const cameraViewX = (p.windowWidth - BASE_WIDTH * scaleFactor) / 2;
        const cameraViewY = (p.windowHeight - BASE_HEIGHT * scaleFactor) / 2;

        // Lerp between bird's-eye and follow-cam using transitionAlpha
        finalScale = p.lerp(fullWorldScale, targetScale, transitionAlpha);
        finalTransX = p.lerp(birdEyeX, cameraViewX, transitionAlpha);
        finalTransY = p.lerp(birdEyeY, cameraViewY, transitionAlpha);

        // Camera position only matters once fully transitioned
        finalCameraX = cameraX * transitionAlpha;
        finalCameraY = cameraY * transitionAlpha;
    }

    p.translate(finalTransX, finalTransY);
    p.scale(finalScale);
    p.translate(-finalCameraX, -finalCameraY);
}

/**
 * Smoothly moves the camera toward the player and clamps it to the
 * world boundaries so the viewport never shows void outside the maze.
 *
 * Uses a linear lerp with CAMERA_LERP each frame rather than the
 * exponential approach used for player movement — this gives a
 * slightly floatier feel that suits the camera.
 *
 * The visible area size is derived from the base canvas size divided
 * by ZOOM, which is exactly the portion of the world visible through
 * the zoomed viewport.
 *
 * Returns updated values — does NOT mutate cameraX/cameraY directly.
 *
 * @param {object} p - p5 instance
 * @param {object} params
 * @param {number} params.cameraX    - current camera X in world px
 * @param {number} params.cameraY    - current camera Y in world px
 * @param {object} params.player     - { gridX, gridY }
 * @param {number} params.worldWidth  - total world width in px
 * @param {number} params.worldHeight - total world height in px
 * @returns {{ cameraX: number, cameraY: number }}
 */
export function followPlayer(
    p,
    { cameraX, cameraY, player, worldWidth, worldHeight },
) {
    // How much of the world is visible through the zoomed viewport
    const visibleWidth = BASE_WIDTH / ZOOM;
    const visibleHeight = BASE_HEIGHT / ZOOM;

    // Centre the viewport on the player tile's centre pixel
    const targetX = player.gridX * TILE_SIZE + TILE_SIZE / 2 - visibleWidth / 2;
    const targetY =
        player.gridY * TILE_SIZE + TILE_SIZE / 2 - visibleHeight / 2;

    let newX = p.lerp(cameraX, targetX, CAMERA_LERP);
    let newY = p.lerp(cameraY, targetY, CAMERA_LERP);

    // Clamp so the viewport never shows outside the maze bounds
    newX = p.constrain(newX, 0, worldWidth - visibleWidth);
    newY = p.constrain(newY, 0, worldHeight - visibleHeight);

    return { cameraX: newX, cameraY: newY };
}
