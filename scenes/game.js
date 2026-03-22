// ============================================================
// scenes/game.js
// HUD, pause menu, and intro countdown.
//
// The HP bar image is placed at its natural size (506×174px) at
// the top-left corner. All other HUD elements are positioned
// relative to measured pixel coordinates within that bar image.
//
// hud-bar.png (506×346):
//   Row 0  y=0..173    full bar (red fill visible)
//   Row 1  y=174..345  empty bar (dark channel)
//
// Fill channel in source: x=147..478 (331px wide), y=62..72
// Clip formula: draw row1 full-width, then draw row0 clipped to
//   x = 0..(FILL_START + FILL_WIDTH * hp/100)  for correct drain
//
// Draw order (bottom → top): Pill → Clock → Bar → Heart
//
// HUD fade-in:
//   Hidden during "GET READY!" and countdown 5→4
//   Fades in from opacity 0→255 when countdown hits 3 (introTimer=3500)
//   Fully opaque at "GO!" (introTimer=6500)
//   Stays fully opaque during PLAYING phase
// ============================================================

import { GAME_PHASE } from '../common/constants.js';
import { drawButton } from '../common/utils.js';

// ─────────────────────────────────────────────────────────────
// Bar image constants  (measured from hud-bar.png)
// ─────────────────────────────────────────────────────────────
const BAR_W = 506;
const BAR_H = 173;
const BAR_SRC_ROW_H = 173;

const FILL_X_START = 147;
const FILL_X_END = 478;
const FILL_WIDTH = FILL_X_END - FILL_X_START; // 331px

const KNOT_CX = 77;
const KNOT_CY = 107;

// ─────────────────────────────────────────────────────────────
// HUD anchor
// ─────────────────────────────────────────────────────────────
const HUD_X = 10;
const HUD_Y = 10;

// ─────────────────────────────────────────────────────────────
// Heart
// ─────────────────────────────────────────────────────────────
const HEART_SIZE = 90;
const HEART_FRAMES = 6;
const HEART_X = HUD_X + KNOT_CX - HEART_SIZE / 2;
const HEART_Y = HUD_Y + KNOT_CY - HEART_SIZE / 2;

// ─────────────────────────────────────────────────────────────
// Clock
// ─────────────────────────────────────────────────────────────
const CLOCK_SIZE = 72;
const CLOCK_FRAMES = 8;
const CLOCK_X = HUD_X + KNOT_CX - CLOCK_SIZE / 2 + 100;
const CLOCK_Y = HUD_Y + BAR_H - 70;

// ─────────────────────────────────────────────────────────────
// Timer pill
// ─────────────────────────────────────────────────────────────
const PILL_H = CLOCK_SIZE * 0.6;
const PILL_W = 180;
const PILL_X = HUD_X + KNOT_CX + 90;
const PILL_Y = CLOCK_Y + 15;

// ─────────────────────────────────────────────────────────────
// HUD fade-in timing
// introTimer=3500 → digit "3" appears → fade starts (opacity 0)
// introTimer=6500 → "GO!"            → fade ends   (opacity 255)
// ─────────────────────────────────────────────────────────────
const HUD_FADE_START = 3500; // introTimer ms when fade begins
const HUD_FADE_END = 6500; // introTimer ms when fully opaque

// ─────────────────────────────────────────────────────────────
// Animation config
// ─────────────────────────────────────────────────────────────
const HEART_MS_NORMAL = 150;
const HEART_MS_FAST = 83;
const CLOCK_MS_PER_FRAME = 1000;

// ─────────────────────────────────────────────────────────────
// Health vignette
// ─────────────────────────────────────────────────────────────
const VIG_THRESH_LOW = 75;
const VIG_THRESH_MED = 50;
const VIG_THRESH_HIGH = 25;
const VIG_ALPHA_LOW = 35;
const VIG_ALPHA_MED = 65;
const VIG_ALPHA_HIGH = 100;

// ─────────────────────────────────────────────────────────────
// Animation state
// ─────────────────────────────────────────────────────────────
let heartTimer = 0,
    heartFrame = 0;
let clockTimer = 0,
    clockFrame = 0;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function drawHealthVignette(p, hp) {
    if (hp > VIG_THRESH_LOW) return;
    const alpha =
        hp <= VIG_THRESH_HIGH
            ? VIG_ALPHA_HIGH
            : hp <= VIG_THRESH_MED
              ? VIG_ALPHA_MED
              : VIG_ALPHA_LOW;
    p.push();
    p.noStroke();
    const STEPS = 12;
    const eW = p.windowWidth * 0.18;
    const eH = p.windowHeight * 0.18;
    for (let i = 0; i < STEPS; i++) {
        const t = 1 - i / STEPS;
        const a = alpha * t * t;
        p.fill(180, 0, 0, a);
        const sw = eW / STEPS,
            sh = eH / STEPS;
        p.rect(i * sw, 0, sw, p.windowHeight);
        p.rect(p.windowWidth - (i + 1) * sw, 0, sw, p.windowHeight);
        p.rect(0, i * sh, p.windowWidth, sh);
        p.rect(0, p.windowHeight - (i + 1) * sh, p.windowWidth, sh);
    }
    p.pop();
}

function tickHeart(dt, hp) {
    const ms = hp <= 50 ? HEART_MS_FAST : HEART_MS_NORMAL;
    heartTimer += dt;
    if (heartTimer >= ms) {
        heartTimer -= ms;
        heartFrame = (heartFrame + 1) % HEART_FRAMES;
    }
    return heartFrame;
}

function tickClock(dt) {
    clockTimer += dt;
    if (clockTimer >= CLOCK_MS_PER_FRAME) {
        clockTimer -= CLOCK_MS_PER_FRAME;
        clockFrame = (clockFrame + 1) % CLOCK_FRAMES;
    }
    return clockFrame;
}

/**
 * Compute HUD opacity (0–255) based on the current game phase and introTimer.
 *
 * @param {string} gamePhase
 * @param {number} introTimer  - ms since level load
 * @returns {number} 0–255
 */
function getHudOpacity(gamePhase, introTimer) {
    if (gamePhase === GAME_PHASE.PLAYING) return 255;
    if (introTimer < HUD_FADE_START) return 0;
    if (introTimer >= HUD_FADE_END) return 255;
    // Linear interpolation across the fade window
    return Math.round(
        ((introTimer - HUD_FADE_START) / (HUD_FADE_END - HUD_FADE_START)) * 255,
    );
}

function drawHpBar(p, barImg, hp, opacity) {
    if (!barImg) {
        p.push();
        p.noStroke();
        p.fill(32, 18, 8, opacity);
        p.rect(HUD_X, HUD_Y, BAR_W, BAR_H);
        p.fill(190, 22, 45, opacity);
        p.rect(HUD_X + FILL_X_START, HUD_Y + 62, (FILL_WIDTH * hp) / 100, 11);
        p.pop();
        return;
    }

    p.push();
    p.imageMode(p.CORNER);

    // 1. Empty bar — always full width
    p.tint(255, opacity);
    p.image(
        barImg,
        HUD_X,
        HUD_Y,
        BAR_W,
        BAR_H,
        0,
        BAR_SRC_ROW_H,
        BAR_W,
        BAR_SRC_ROW_H,
    );

    // 2. Full-fill bar clipped to fill region
    const clipRight =
        FILL_X_START + Math.round(FILL_WIDTH * p.constrain(hp / 100, 0, 1));

    if (clipRight > FILL_X_START) {
        p.drawingContext.save();
        p.drawingContext.beginPath();
        p.drawingContext.rect(HUD_X, HUD_Y, clipRight, BAR_H);
        p.drawingContext.clip();
        p.tint(255, opacity);
        p.image(barImg, HUD_X, HUD_Y, BAR_W, BAR_H, 0, 0, BAR_W, BAR_SRC_ROW_H);
        p.drawingContext.restore();
    }

    p.noTint();
    p.pop();
}

function drawTimerPill(p, timeStr, fonts, opacity) {
    const a = opacity;
    p.push();
    p.noStroke();
    p.fill(22, 14, 8, Math.round((235 * a) / 255));
    p.rect(PILL_X, PILL_Y, PILL_W, PILL_H, PILL_H / 2);
    p.fill(55, 38, 18, Math.round((100 * a) / 255));
    p.rect(PILL_X + 4, PILL_Y + 3, PILL_W - 8, PILL_H / 2 - 4, PILL_H / 2 - 6);
    p.noFill();
    p.stroke(88, 60, 28, a);
    p.strokeWeight(1.5);
    p.rect(PILL_X, PILL_Y, PILL_W, PILL_H, PILL_H / 2);
    p.noStroke();
    if (fonts?.body) p.textFont(fonts.body);
    p.fill(220, 200, 140, a);
    p.textSize(24);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(timeStr, PILL_X + PILL_W / 2, PILL_Y + PILL_H / 2);
    p.pop();
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * @param {object} p
 * @param {object} params
 * @param {object}  params.player
 * @param {number}  params.timeLeft
 * @param {number}  params.timeBonusTextTimer
 * @param {boolean} params.debugMode
 * @param {number}  params.dt
 * @param {string}  params.gamePhase    - GAME_PHASE constant, drives fade-in
 * @param {number}  params.introTimer   - ms since level load, drives fade-in
 * @param {object}  [params.fonts]
 * @param {object}  [params.assets]
 */
export function drawHUD(
    p,
    {
        player,
        timeLeft,
        timeBonusTextTimer,
        debugMode,
        dt = 16,
        gamePhase,
        introTimer = 0,
        fonts,
        assets,
    },
) {
    const hp = player.hp;
    const barImg = assets?.hudBar ?? null;
    const heartImg = assets?.hudHeart ?? null;
    const clockImg = assets?.hudClock ?? null;

    // ── Health vignette always visible (independent of HUD fade) ─
    drawHealthVignette(p, hp);

    // ── Compute HUD opacity ────────────────────────────────────
    const opacity = getHudOpacity(gamePhase, introTimer);

    // Nothing to draw if fully transparent
    if (opacity === 0) return;

    // ── Advance animation timers ───────────────────────────────
    const hFrame = tickHeart(dt, hp);
    const cFrame = tickClock(dt);

    const totalSec = Math.ceil(timeLeft);
    const timeStr = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;

    // ── z=0  Timer pill ────────────────────────────────────────
    drawTimerPill(p, timeStr, fonts, opacity);

    // +30s flash (only when fully visible to avoid double-fade weirdness)
    if (timeBonusTextTimer > 0 && opacity === 255) {
        p.push();
        const alpha = p.map(timeBonusTextTimer, 0, 3000, 0, 255);
        if (fonts?.heading) p.textFont(fonts.heading);
        p.textSize(22);
        p.textAlign(p.LEFT, p.CENTER);
        p.fill(255, 255, 0, alpha);
        p.text('+30s', PILL_X + PILL_W + 12, PILL_Y + PILL_H / 2);
        p.pop();
    }

    // ── z=1  HP bar ────────────────────────────────────────────
    drawHpBar(p, barImg, hp, opacity);

    // ── z=3  Heart ─────────────────────────────────────────────
    if (heartImg) {
        p.push();
        p.imageMode(p.CORNER);
        p.tint(255, opacity);
        p.image(
            heartImg,
            HEART_X,
            HEART_Y,
            HEART_SIZE,
            HEART_SIZE,
            hFrame * 32,
            0,
            32,
            32,
        );
        p.noTint();
        p.pop();
    } else {
        p.push();
        p.noStroke();
        const hcx = HEART_X + HEART_SIZE / 2;
        const hcy = HEART_Y + HEART_SIZE / 2;
        p.fill(200, 30, 55, opacity);
        p.ellipse(
            hcx - HEART_SIZE * 0.15,
            hcy - HEART_SIZE * 0.1,
            HEART_SIZE * 0.5,
        );
        p.ellipse(
            hcx + HEART_SIZE * 0.15,
            hcy - HEART_SIZE * 0.1,
            HEART_SIZE * 0.5,
        );
        p.triangle(
            hcx - HEART_SIZE * 0.4,
            hcy + HEART_SIZE * 0.05,
            hcx + HEART_SIZE * 0.4,
            hcy + HEART_SIZE * 0.05,
            hcx,
            hcy + HEART_SIZE * 0.45,
        );
        p.pop();
    }

    // ── z=2  Clock ────────────────────────────────────────────
    if (clockImg) {
        p.push();
        p.imageMode(p.CORNER);
        p.tint(255, opacity);
        p.image(
            clockImg,
            CLOCK_X,
            CLOCK_Y,
            CLOCK_SIZE,
            CLOCK_SIZE,
            cFrame * 32,
            0,
            32,
            32,
        );
        p.noTint();
        p.pop();
    } else {
        p.push();
        p.noStroke();
        p.fill(42, 34, 52, opacity);
        p.circle(
            CLOCK_X + CLOCK_SIZE / 2,
            CLOCK_Y + CLOCK_SIZE / 2,
            CLOCK_SIZE,
        );
        p.stroke(180, 160, 100, opacity);
        p.strokeWeight(2);
        const a = cFrame * ((Math.PI * 2) / 8) - Math.PI / 2;
        p.line(
            CLOCK_X + CLOCK_SIZE / 2,
            CLOCK_Y + CLOCK_SIZE / 2,
            CLOCK_X + CLOCK_SIZE / 2 + Math.cos(a) * CLOCK_SIZE * 0.35,
            CLOCK_Y + CLOCK_SIZE / 2 + Math.sin(a) * CLOCK_SIZE * 0.35,
        );
        p.pop();
    }

    // HP % text
    p.push();
    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(16);
    p.textAlign(p.CENTER, p.CENTER);
    const tx = HEART_X + HEART_SIZE / 2 + 1;
    const ty = HEART_Y + HEART_SIZE * 0.39;
    p.fill(0, 0, 0, Math.round((180 * opacity) / 255));
    p.text(`${Math.ceil(hp)}`, tx + 1, ty + 1);
    p.fill(255, 230, 200, opacity);
    p.text(`${Math.ceil(hp)}`, tx, ty);
    p.pop();

    if (debugMode) {
        p.push();
        if (fonts?.body) p.textFont(fonts.body);
        p.fill(255, 200, 0);
        p.textSize(14);
        p.textAlign(p.RIGHT, p.TOP);
        p.text('DEBUG ON', p.windowWidth - 10, 10);
        p.pop();
    }
}

export function drawIntroCountdown(
    p,
    { gamePhase, introTimer, fogOpacity, fonts },
) {
    if (gamePhase === GAME_PHASE.PLAYING) return;
    p.push();
    p.resetMatrix();
    const alpha = 255 - fogOpacity;
    let str = '',
        size = 92;
    if (introTimer < 1500) {
        str = 'GET READY!';
    } else if (introTimer < 6500) {
        str = Math.floor(6 - (introTimer - 1500) / 1000).toString();
        size = 160 + p.map(introTimer % 1000, 0, 200, 20, 0, true);
    } else {
        str = 'GO!';
        size = 192;
    }
    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);
    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(size);
    p.fill(0, alpha * 0.4);
    p.text(str, p.windowWidth / 2 + 5, p.windowHeight / 2 + 5);
    p.fill(255, alpha);
    p.text(str, p.windowWidth / 2, p.windowHeight / 2);
    p.pop();
}

export function drawPauseMenu(
    p,
    { onResume, onRetry, onLevels, onMenu, fonts, assets },
) {
    p.fill(0, 180);
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
