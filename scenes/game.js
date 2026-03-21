// ============================================================
// scenes/game.js
// Draws the in-game scene: world, HUD, pause overlay, and intro countdown.
// Also contains the pause menu draw call.
// ============================================================

import { GAME_PHASE } from '../common/constants.js';
import { drawButton } from '../common/utils.js';

/**
 * Draws the HUD overlay: HP, timer, debug indicator, and "+30s" bonus flash.
 * Drawn in screen-space (no camera transform applied).
 *
 * @param {object} p - p5 instance
 * @param {object} params
 * @param {object}  params.player
 * @param {number}  params.timeLeft
 * @param {number}  params.timeBonusTextTimer
 * @param {boolean} params.debugMode
 * @param {object}  [params.fonts]  - { heading, body }
 */
export function drawHUD(
    p,
    { player, timeLeft, timeBonusTextTimer, debugMode, fonts },
) {
    if (fonts?.body) p.textFont(fonts.body);
    p.fill(255);
    p.textSize(24);
    p.textAlign(p.LEFT, p.TOP);

    p.text(`HP: ${player.hp}%`, 10, 10);

    const totalSeconds = Math.ceil(timeLeft);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    p.text(`Time: ${mins}:${secs.toString().padStart(2, '0')}`, 10, 30);

    if (timeBonusTextTimer > 0) {
        p.push();
        const alpha = p.map(timeBonusTextTimer, 0, 2000, 0, 255);
        if (fonts?.heading) p.textFont(fonts.heading);
        p.fill(255, 255, 0, alpha);
        p.text('+30s', 150, 30);
        p.pop();
    }

    if (fonts?.body) p.textFont(fonts.body);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`DEBUG MODE: ${debugMode ? 'ON' : 'OFF'}`, p.windowWidth - 10, 10);
}

/**
 * Renders the "GET READY / 5…1 / GO!" countdown overlay during the intro phase.
 *
 * @param {object} p - p5 instance
 * @param {object} params
 * @param {string} params.gamePhase
 * @param {number} params.introTimer
 * @param {number} params.fogOpacity
 * @param {object} [params.fonts]
 */
export function drawIntroCountdown(
    p,
    { gamePhase, introTimer, fogOpacity, fonts },
) {
    if (gamePhase === GAME_PHASE.PLAYING) return;

    p.push();
    p.resetMatrix();

    const textAlpha = 255 - fogOpacity;
    let displayStr = '';
    let displaySize = 48;

    if (introTimer < 1500) {
        displayStr = 'GET READY!';
    } else if (introTimer < 6500) {
        const secondsElapsed = (introTimer - 1500) / 1000;
        displayStr = Math.floor(6 - secondsElapsed).toString();
        displaySize = 90 + p.map(introTimer % 1000, 0, 200, 20, 0, true);
    } else {
        displayStr = 'GO!';
        displaySize = 100;
    }

    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);
    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(displaySize);

    p.fill(0, textAlpha * 0.4);
    p.text(displayStr, p.windowWidth / 2 + 5, p.windowHeight / 2 + 5);

    p.fill(255, textAlpha);
    p.text(displayStr, p.windowWidth / 2, p.windowHeight / 2);

    p.pop();
}

/**
 * Draws the pause overlay: darkened screen and navigation buttons.
 *
 * @param {object} p - p5 instance
 * @param {object} callbacks
 * @param {function} callbacks.onResume
 * @param {function} callbacks.onRetry
 * @param {function} callbacks.onLevels
 * @param {function} callbacks.onMenu
 * @param {object}   [callbacks.fonts]
 * @param {object}   [callbacks.assets]
 */
export function drawPauseMenu(
    p,
    { onResume, onRetry, onLevels, onMenu, fonts, assets },
) {
    p.fill(0, 200);
    p.rectMode(p.CORNER);
    p.noStroke();
    p.rect(0, 0, p.windowWidth, p.windowHeight);

    p.textAlign(p.CENTER, p.CENTER);
    p.fill(255);
    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(48);
    p.text('PAUSED', p.windowWidth / 2, p.windowHeight / 2 - 120);

    drawButton(
        p,
        'RESUME',
        p.windowWidth / 2,
        p.windowHeight / 2 - 40,
        onResume,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'RETRY',
        p.windowWidth / 2,
        p.windowHeight / 2 + 30,
        onRetry,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'LEVELS',
        p.windowWidth / 2,
        p.windowHeight / 2 + 100,
        onLevels,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'MENU',
        p.windowWidth / 2,
        p.windowHeight / 2 + 170,
        onMenu,
        300,
        50,
        fonts,
        assets,
    );
}
