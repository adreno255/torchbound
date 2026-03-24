// ============================================================
// scenes/tutorial.js
// Handles the tutorial level: static maze, stop-point detection,
// info card display, freeze/resume logic, and tutorial-specific
// game-over / cleared screens.
//
// Marker tile values (20-30) map to letters A-K:
//   A=20  D=21  B=22  E=23  C=24
//   F=25  G=26  H=27  I=28  J=29  K=30
// ============================================================

import { TILE_MAP } from '../common/constants.js';
import { drawButton } from '../common/utils.js';

// ── Tutorial marker tile values ───────────────────────────────────────────
export const TUTORIAL_MARKERS = {
    A: 20,
    D: 21,
    B: 22,
    E: 23,
    C: 24,
    F: 25,
    G: 26,
    H: 27,
    I: 28,
    J: 29,
    K: 30,
};

// ── Static tutorial maze (7 rows x 19 cols) ───────────────────────────────
export const TUTORIAL_MAZE = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [2, 20, 1, 6, 0, 0, 1, 8, 0, 0, 1, 9, 0, 0, 1, 29, 0, 0, 1],
    [1, 0, 1, 21, 1, 0, 1, 25, 1, 0, 1, 27, 1, 0, 1, 0, 1, 0, 1],
    [1, 22, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 23, 1, 0, 1, 26, 1, 0, 1, 0, 1, 0, 1, 30, 1],
    [1, 0, 24, 5, 1, 4, 0, 0, 1, 7, 0, 0, 1, 28, 0, 0, 1, 0, 3],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// ── Stop-point registry ───────────────────────────────────────────────────
export const STOP_POINTS = [
    {
        id: 'start',
        tileValue: TILE_MAP.start,
        gridX: 0,
        gridY: 1,
        title: 'Welcome, Adventurer!',
        body: [
            'Use WASD or the Arrow Keys to move.',
            'Tap a key once to step, or hold it to keep moving.',
            'Find the exit tile to escape the maze!',
        ],
    },
    {
        id: 'A',
        tileValue: TUTORIAL_MARKERS.A,
        gridX: 1,
        gridY: 1,
        title: 'The Entrance Rune',
        body: [
            'This glowing rune marks the start of every maze.',
            'If a trap sends you back, you will reappear here.',
            'Remember where it is — it might save your life.',
        ],
    },
    {
        id: 'B',
        tileValue: TUTORIAL_MARKERS.B,
        gridX: 1,
        gridY: 3,
        title: 'HP and Timer',
        body: [
            'The bar at the top-left shows your Health Points.',
            'The clock next to it counts down your remaining time.',
            'Reach zero on either and your run is over.',
        ],
    },
    {
        id: 'C',
        tileValue: TUTORIAL_MARKERS.C,
        gridX: 2,
        gridY: 5,
        title: 'Pit Trap',
        body: [
            'Step on this when the floor is open and you fall in!',
            'It teleports you straight back to the entrance.',
            'Wait for the panels to close before crossing.',
        ],
    },
    {
        id: 'D',
        tileValue: TUTORIAL_MARKERS.D,
        gridX: 3,
        gridY: 2,
        title: 'Darkness Trap',
        body: [
            'This trap collapses your torch radius for 5 seconds.',
            'You can barely see anything while the effect lasts.',
            'A Torch Power-Up can cut through the darkness!',
        ],
    },
    {
        id: 'E',
        tileValue: TUTORIAL_MARKERS.E,
        gridX: 5,
        gridY: 4,
        title: 'Spike Trap',
        body: [
            'Spikes rise from the floor and drain your HP fast.',
            'The deeper the level, the more damage they deal.',
            'Cross only when the spikes are fully retracted.',
        ],
    },
    {
        id: 'F',
        tileValue: TUTORIAL_MARKERS.F,
        gridX: 7,
        gridY: 2,
        title: 'Torch Boost',
        body: [
            'Collecting this doubles your torch radius for 5 seconds.',
            'Use it to scout ahead or survive a darkness trap.',
            'It disappears once collected, so grab it quick!',
        ],
    },
    {
        id: 'G',
        tileValue: TUTORIAL_MARKERS.G,
        gridX: 9,
        gridY: 4,
        title: 'Time Crystal',
        body: [
            'This crystal adds 30 seconds back to your clock.',
            'Always worth grabbing when the timer is running low.',
            'Plan your route to collect them along the way.',
        ],
    },
    {
        id: 'H',
        tileValue: TUTORIAL_MARKERS.H,
        gridX: 11,
        gridY: 2,
        title: 'Vision Orb',
        body: [
            'Reveals the entire maze layout for 3 seconds.',
            'Use that window to memorise the path to the exit.',
            'Just hope that you have a good memory!',
        ],
    },
    {
        id: 'I',
        tileValue: TUTORIAL_MARKERS.I,
        gridX: 13,
        gridY: 5,
        title: 'Ever-Shifting Mazes',
        body: [
            'Every real level spawns a brand-new, random maze.',
            'Trap and power-up positions change with each run.',
            'Luck plays its part — but skill always wins out.',
        ],
    },
    {
        id: 'J',
        tileValue: TUTORIAL_MARKERS.J,
        gridX: 15,
        gridY: 1,
        title: 'Score and Leaderboards',
        body: [
            'Score = remaining HP x10 + remaining time x20.',
            'Stay healthy and fast to climb the rankings.',
            'Compete on level boards or the overall Hall of Fame!',
        ],
    },
    {
        id: 'K',
        tileValue: TUTORIAL_MARKERS.K,
        gridX: 17,
        gridY: 4,
        title: 'You Are Ready!',
        body: [
            'The exit tile shines just ahead — step on it to escape.',
            'You now know everything needed to survive the dungeon.',
            'Good luck, adventurer. The mazes await you!',
        ],
    },
];

// ── Card layout constants ─────────────────────────────────────────────────
// Card is sized to hold exactly 3 body lines + button without overflow.
//
// Vertical budget (270px total):
//   title area   :  0 – 56px  (title centred at y+32, rule at y+56)
//   body area    : 56 –202px  (3 lines × 28px leading, first at +82)
//   button area  :202 –270px  (rule at -68 from bot, button at -36)
const CARD_W = 560;
const CARD_H = 270;
const CARD_PAD_X = 32; // horizontal margin for rules and text

// Pause before card appears so the player sees the tile they landed on.
export const STOP_PAUSE_MS = 400;

// ── Card renderer ─────────────────────────────────────────────────────────

/**
 * Draws the tutorial info card (dark parchment, yellow/brown accents).
 *
 * @param {object}   p
 * @param {object}   stopPoint   - { title, body: string[] }
 * @param {function} onContinue
 * @param {object}   [fonts]
 * @param {object}   [assets]
 */
export function drawTutorialCard(p, stopPoint, onContinue, fonts, assets) {
    if (!stopPoint) return;

    const cx = p.windowWidth / 2;
    const cy = p.windowHeight / 2;
    const top = cy - CARD_H / 2;
    const bot = cy + CARD_H / 2;
    const left = cx - CARD_W / 2 + CARD_PAD_X;
    const right = cx + CARD_W / 2 - CARD_PAD_X;

    // Dim overlay
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 160);
    p.rect(0, 0, p.windowWidth, p.windowHeight);
    p.pop();

    // Card background
    p.push();
    p.rectMode(p.CENTER);
    p.fill(28, 18, 10, 245);
    p.stroke(120, 80, 30);
    p.strokeWeight(2);
    p.rect(cx, cy, CARD_W, CARD_H, 8);
    p.pop();

    // Decorative rules
    p.push();
    p.stroke(200, 140, 40, 160);
    p.strokeWeight(1);
    p.line(left, top + 56, right, top + 56); // below title
    p.line(left, bot - 68, right, bot - 68); // above button
    p.pop();

    // Title (centred, 28px, alagard)
    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(28);
    p.fill(80, 50, 15);
    p.text(stopPoint.title, cx, top + 33);
    p.fill(255, 220, 140);
    p.text(stopPoint.title, cx, top + 32);
    p.pop();

    // Body lines (17px, determination, 28px leading)
    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(17);
    const lineH = 28;
    const bodyStartY = top + 82;
    stopPoint.body.forEach((line, i) => {
        const ly = bodyStartY + i * lineH;
        p.fill(60, 35, 10, 180);
        p.text(line, cx + 1, ly + 1);
        p.fill(210, 190, 155);
        p.text(line, cx, ly);
    });
    p.pop();

    // Continue button
    drawButton(p, 'CONTINUE', cx, bot - 36, onContinue, 220, 44, fonts, assets);
}

// ── Tutorial outcome screens ──────────────────────────────────────────────

export function drawTutorialCleared(p, { onLevels, onMenu, fonts, assets }) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(90);
    p.fill(80);
    p.text('TUTORIAL CLEARED!', p.windowWidth / 2, p.windowHeight / 2 - 180);
    p.fill(255, 230, 100);
    p.text('TUTORIAL CLEARED!', p.windowWidth / 2, p.windowHeight / 2 - 185);

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(22);
    p.fill(200, 185, 155);
    p.text(
        'You are ready to conquer the dungeon. Good luck, adventurer!',
        p.windowWidth / 2,
        p.windowHeight / 2 - 50,
    );

    drawButton(
        p,
        'LEVELS',
        p.windowWidth / 2 - 170,
        p.windowHeight / 2 + 50,
        onLevels,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'MENU',
        p.windowWidth / 2 + 170,
        p.windowHeight / 2 + 50,
        onMenu,
        300,
        50,
        fonts,
        assets,
    );
}

export function drawTutorialGameOver(
    p,
    { lossReason, onRetry, onMenu, fonts, assets },
) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(108);
    p.fill(80);
    p.text('GAME OVER!', p.windowWidth / 2, p.windowHeight / 2 - 180);
    p.fill(255);
    p.text('GAME OVER!', p.windowWidth / 2, p.windowHeight / 2 - 185);

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(24);
    p.fill(200);
    p.text(lossReason, p.windowWidth / 2, p.windowHeight / 2 - 50);

    drawButton(
        p,
        'RETRY',
        p.windowWidth / 2 - 170,
        p.windowHeight / 2 + 50,
        onRetry,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'MENU',
        p.windowWidth / 2 + 170,
        p.windowHeight / 2 + 50,
        onMenu,
        300,
        50,
        fonts,
        assets,
    );
}

// ── Stop-point manager ────────────────────────────────────────────────────

/**
 * Creates a stop-point manager.
 * Call reset() when the tutorial level loads or retries.
 * Call check(player) every frame during the PLAYING phase.
 */
export function createStopManager() {
    const triggered = new Set();

    return {
        /** Clear all triggered flags (called on load / retry). */
        reset() {
            triggered.clear();
        },

        /**
         * Returns the matching StopPoint if the player just entered an
         * untriggered stop-point tile, otherwise null.
         */
        check(player) {
            for (const sp of STOP_POINTS) {
                if (triggered.has(sp.id)) continue;
                if (player.gridX === sp.gridX && player.gridY === sp.gridY) {
                    return sp;
                }
            }
            return null;
        },

        /** Mark a stop as triggered so it never fires again this session. */
        trigger(id) {
            triggered.add(id);
        },

        hasTriggered(id) {
            return triggered.has(id);
        },
    };
}
