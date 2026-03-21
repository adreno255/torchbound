// ============================================================
// utils.js
// Shared utility functions used across multiple modules.
// ============================================================

import { BASE_WIDTH, BASE_HEIGHT } from './constants.js';

/**
 * Calculates the scale factor to fit the base canvas into the window
 * while preserving aspect ratio.
 *
 * @param {object} p - p5 instance
 * @returns {number} scaleFactor
 */
export function getScaleFactor(p) {
    return Math.min(p.windowWidth / BASE_WIDTH, p.windowHeight / BASE_HEIGHT);
}

/**
 * Calculates a score from remaining HP and time.
 *
 * @param {number} hp
 * @param {number} timeLeft
 * @returns {number}
 */
export function calculateScore(hp, timeLeft) {
    return Math.floor(hp) * 10 + Math.max(0, Math.floor(timeLeft)) * 20;
}

// ── Button tileset constants ──────────────────────────────────────────────
// Sheet layout: 3 cols × 2 rows, each cell 16×16px → 48×32px
//   Col 0 = left cap, Col 1 = mid tile, Col 2 = right cap
//   Row 0 = normal (srcY = 0),  Row 1 = hover (srcY = 16)
const BTN_TILE = 16;

/**
 * Draws a pixel-art 3-slice button using button-tiles.png.
 * Falls back to a plain filled rect if the tileset hasn't loaded.
 *
 * Also calls p._registerButtonHover() when hovered so main.js can
 * flip the CSS cursor to 'pointer' for that frame.
 *
 * @param {object}   p
 * @param {string}   label
 * @param {number}   x        - center X
 * @param {number}   y        - center Y
 * @param {function} onClick
 * @param {number}   [btnW=300]
 * @param {number}   [btnH=50]
 * @param {object}   [fonts]  - { heading, body }
 * @param {object}   [assets] - { buttonTiles: p5.Image }
 */
export function drawButton(
    p,
    label,
    x,
    y,
    onClick,
    btnW = 300,
    btnH = 50,
    fonts = null,
    assets = null,
) {
    const isHovered =
        p.mouseX > x - btnW / 2 &&
        p.mouseX < x + btnW / 2 &&
        p.mouseY > y - btnH / 2 &&
        p.mouseY < y + btnH / 2;

    // Signal to main.js that the cursor should be a pointer this frame
    if (isHovered && typeof p._registerButtonHover === 'function') {
        p._registerButtonHover();
    }

    const img = assets?.buttonTiles ?? null;

    if (img) {
        _drawPixelButtonSlices(p, img, x, y, btnW, btnH, isHovered);
    } else {
        // Fallback plain rect
        p.fill(isHovered ? 100 : 50);
        p.rectMode(p.CENTER);
        p.noStroke();
        p.rect(x, y, btnW, btnH, 5);
    }

    // Label
    p.noStroke();
    p.fill(255);
    p.textSize(20);
    p.textAlign(p.CENTER, p.CENTER);
    if (fonts?.body) p.textFont(fonts.body);
    p.text(label, x, y);

    if (isHovered && p.mouseIsPressed) {
        p.mouseIsPressed = false;
        onClick();
    }
}

/**
 * Internal helper — renders the 3-slice pixel button slices.
 * Exported so menu.js can call it for the locked-level button (with tint).
 *
 * @param {object}   p
 * @param {p5.Image} img
 * @param {number}   cx
 * @param {number}   cy
 * @param {number}   btnW
 * @param {number}   btnH
 * @param {boolean}  hover
 */
export function _drawPixelButtonSlices(p, img, cx, cy, btnW, btnH, hover) {
    const srcRow = hover ? BTN_TILE : 0;
    const capW = btnH; // cap = square (width = height)
    const midW = btnW - capW * 2;
    const x0 = cx - btnW / 2;
    const y0 = cy - btnH / 2;

    p.noStroke();
    p.imageMode(p.CORNER);

    // Left cap
    p.image(img, x0, y0, capW, btnH, 0, srcRow, BTN_TILE, BTN_TILE);

    // Middle — stretched
    if (midW > 0) {
        p.image(
            img,
            x0 + capW,
            y0,
            midW,
            btnH,
            BTN_TILE,
            srcRow,
            BTN_TILE,
            BTN_TILE,
        );
    }

    // Right cap
    p.image(
        img,
        x0 + btnW - capW,
        y0,
        capW,
        btnH,
        BTN_TILE * 2,
        srcRow,
        BTN_TILE,
        BTN_TILE,
    );
}
