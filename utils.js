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

/**
 * Draws a clickable p5 button. Calls onClick() when hovered and pressed.
 * Uses mouseIsPressed debounce to prevent multi-fire.
 *
 * @param {object} p - p5 instance
 * @param {string}   label
 * @param {number}   x      - center X
 * @param {number}   y      - center Y
 * @param {function} onClick
 * @param {number}   [btnW=300]
 * @param {number}   [btnH=50]
 */
export function drawButton(p, label, x, y, onClick, btnW = 300, btnH = 50) {
    const isHovered =
        p.mouseX > x - btnW / 2 &&
        p.mouseX < x + btnW / 2 &&
        p.mouseY > y - btnH / 2 &&
        p.mouseY < y + btnH / 2;

    p.fill(isHovered ? 100 : 50);
    p.rectMode(p.CENTER);
    p.rect(x, y, btnW, btnH, 5);

    p.fill(255);
    p.textSize(20);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(label, x, y);

    if (isHovered && p.mouseIsPressed) {
        p.mouseIsPressed = false;
        onClick();
    }
}
