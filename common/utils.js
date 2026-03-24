// ============================================================
// common/utils.js
// Shared utility functions used across multiple modules.
//
// Contains:
//   getScaleFactor()        — responsive canvas scaling
//   calculateScore()        — HP + time scoring formula
//   drawButton()            — 3-slice pixel-art button renderer
//   _drawPixelButtonSlices() — internal slice renderer (also used by menu.js)
// ============================================================

import { BASE_WIDTH, BASE_HEIGHT } from './constants.js';

// ── Responsive scaling ────────────────────────────────────────────────────

/**
 * Calculates the uniform scale factor that fits the logical base canvas
 * (BASE_WIDTH × BASE_HEIGHT) into the current browser window while
 * preserving the aspect ratio.
 *
 * Used by applyCamera() and window-resize handlers in main.js to keep
 * all coordinate math consistent regardless of screen size.
 *
 * @param {object} p - p5 instance
 * @returns {number} scaleFactor — multiply logical coords by this to get screen coords
 */
export function getScaleFactor(p) {
    return Math.min(p.windowWidth / BASE_WIDTH, p.windowHeight / BASE_HEIGHT);
}

// ── Scoring ───────────────────────────────────────────────────────────────

/**
 * Calculates the player's score at the end of a level.
 *
 * Formula:
 *   score = floor(hp) × 10  +  max(0, floor(timeLeft)) × 20
 *
 * Rationale: remaining HP rewards survival; remaining time rewards speed.
 * Both are floored so fractional values don't produce misleading numbers.
 *
 * @param {number} hp       - remaining hit points (0–100)
 * @param {number} timeLeft - remaining countdown seconds (≥ 0)
 * @returns {number} integer score
 */
export function calculateScore(hp, timeLeft) {
    return Math.floor(hp) * 10 + Math.max(0, Math.floor(timeLeft)) * 20;
}

// ── Button tileset constants ──────────────────────────────────────────────
// Source sheet layout (button-tiles.png): 3 cols × 2 rows, each cell 16×16px
//   Col 0 = left cap     Col 1 = mid tile     Col 2 = right cap
//   Row 0 = normal state (srcY = 0)
//   Row 1 = hover  state (srcY = 16)
const BTN_TILE = 16; // source tile size in px

// ── Button renderer ───────────────────────────────────────────────────────

/**
 * Draws a pixel-art 3-slice button using the button-tiles spritesheet.
 *
 * The button is centred on (x, y). Hover detection uses raw p.mouseX/Y
 * (screen space), so this must be called AFTER p.resetMatrix() or from
 * a p.push/pop block that has not applied a world transform.
 *
 * Also calls p._registerButtonHover() when hovered, which signals
 * main.js to flip the CSS cursor to 'pointer' for that frame.
 *
 * Falls back to a plain filled rect if the tileset image hasn't loaded.
 *
 * @param {object}     p
 * @param {string}     label        - button text
 * @param {number}     x            - centre X in screen space
 * @param {number}     y            - centre Y in screen space
 * @param {function}   onClick      - fired once when the button is clicked
 * @param {number}     [btnW=300]   - total button width in px
 * @param {number}     [btnH=50]    - total button height in px
 * @param {object}     [fonts]      - { heading, body } p5.Font objects
 * @param {object}     [assets]     - { buttonTiles: p5.Image }
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
        // Fallback: plain rounded rectangle
        p.fill(isHovered ? 100 : 50);
        p.rectMode(p.CENTER);
        p.noStroke();
        p.rect(x, y, btnW, btnH, 5);
    }

    // Label — drawn on top of the button background
    p.noStroke();
    p.fill(255);
    p.textSize(20);
    p.textAlign(p.CENTER, p.CENTER);
    if (fonts?.body) p.textFont(fonts.body);
    p.text(label, x, y);

    // Fire onClick once per click, then suppress p.mouseIsPressed for this frame
    if (isHovered && p.mouseIsPressed) {
        p.mouseIsPressed = false;
        onClick();
    }
}

/**
 * Internal helper — renders the three sliced sections of the pixel button.
 *
 * Exported so that menu.js can reuse it for the locked-level button
 * (which needs custom tinting and no onClick handler).
 *
 * Slice breakdown:
 *   left cap  : BTN_TILE × BTN_TILE source → (capW × btnH) destination
 *   mid tile  : stretched between the two caps
 *   right cap : mirror of left cap
 *
 * The cap width equals the button height so the caps always appear square.
 *
 * @param {object}   p
 * @param {p5.Image} img     - button-tiles.png
 * @param {number}   cx      - button centre X
 * @param {number}   cy      - button centre Y
 * @param {number}   btnW    - total button width
 * @param {number}   btnH    - total button height
 * @param {boolean}  hover   - true = use hover row in source sheet
 */
export function _drawPixelButtonSlices(p, img, cx, cy, btnW, btnH, hover) {
    // Row offset in the source sheet (normal = row 0, hover = row 1)
    const srcRow = hover ? BTN_TILE : 0;
    const capW = btnH; // cap width = button height (keeps caps square)
    const midW = btnW - capW * 2;
    const x0 = cx - btnW / 2; // left edge
    const y0 = cy - btnH / 2; // top edge

    p.noStroke();
    p.imageMode(p.CORNER);

    // Left cap — source col 0
    p.image(img, x0, y0, capW, btnH, 0, srcRow, BTN_TILE, BTN_TILE);

    // Middle — source col 1, stretched to fill remaining width
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

    // Right cap — source col 2
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
