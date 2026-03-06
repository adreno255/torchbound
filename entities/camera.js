// ============================================================
// entities/camera.js
// Handles the camera transform: intro pan, zoom, and smooth follow.
// ============================================================

import {
    BASE_WIDTH,
    BASE_HEIGHT,
    TILE_SIZE,
    ZOOM,
    CAMERA_LERP,
} from '../constants.js';

/**
 * Applies the camera transformation to the p5 sketch for the current frame.
 * Handles both the bird's-eye intro pan and the normal zoomed follow.
 * Must be called inside a p.push() / p.pop() block, before drawing world content.
 *
 * @param {object} p - p5 instance
 * @param {object} state
 * @param {boolean} state.enableCamera
 * @param {number}  state.scaleFactor
 * @param {number}  state.worldWidth
 * @param {number}  state.worldHeight
 * @param {number}  state.transitionAlpha - 0 = bird's-eye, 1 = zoomed
 * @param {object}  state.player
 * @param {number}  state.cameraX
 * @param {number}  state.cameraY
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

    const fullWorldScale = Math.min(
        p.windowWidth / worldWidth,
        p.windowHeight / worldHeight,
    );
    const birdEyeX = (p.windowWidth - worldWidth * fullWorldScale) / 2;
    const birdEyeY = (p.windowHeight - worldHeight * fullWorldScale) / 2;

    let finalScale, finalTransX, finalTransY, finalCameraX, finalCameraY;

    if (!enableCamera) {
        // Debug map mode: show the full world, no follow
        finalScale = fullWorldScale;
        finalTransX = birdEyeX;
        finalTransY = birdEyeY;
        finalCameraX = 0;
        finalCameraY = 0;
    } else {
        const targetScale = scaleFactor * ZOOM;
        const cameraViewX = (p.windowWidth - BASE_WIDTH * scaleFactor) / 2;
        const cameraViewY = (p.windowHeight - BASE_HEIGHT * scaleFactor) / 2;

        finalScale = p.lerp(fullWorldScale, targetScale, transitionAlpha);
        finalTransX = p.lerp(birdEyeX, cameraViewX, transitionAlpha);
        finalTransY = p.lerp(birdEyeY, cameraViewY, transitionAlpha);
        finalCameraX = cameraX * transitionAlpha;
        finalCameraY = cameraY * transitionAlpha;
    }

    p.translate(finalTransX, finalTransY);
    p.scale(finalScale);
    p.translate(-finalCameraX, -finalCameraY);
}

/**
 * Smoothly moves the camera toward the player and clamps it to world bounds.
 * Returns the updated camera position — does not mutate directly.
 *
 * @param {object} p - p5 instance
 * @param {object} params
 * @param {number} params.cameraX
 * @param {number} params.cameraY
 * @param {object} params.player
 * @param {number} params.worldWidth
 * @param {number} params.worldHeight
 * @returns {{ cameraX: number, cameraY: number }}
 */
export function followPlayer(
    p,
    { cameraX, cameraY, player, worldWidth, worldHeight },
) {
    const visibleWidth = BASE_WIDTH / ZOOM;
    const visibleHeight = BASE_HEIGHT / ZOOM;

    const targetX = player.gridX * TILE_SIZE + TILE_SIZE / 2 - visibleWidth / 2;
    const targetY =
        player.gridY * TILE_SIZE + TILE_SIZE / 2 - visibleHeight / 2;

    let newX = p.lerp(cameraX, targetX, CAMERA_LERP);
    let newY = p.lerp(cameraY, targetY, CAMERA_LERP);

    newX = p.constrain(newX, 0, worldWidth - visibleWidth);
    newY = p.constrain(newY, 0, worldHeight - visibleHeight);

    return { cameraX: newX, cameraY: newY };
}
