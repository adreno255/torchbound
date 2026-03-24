// ============================================================
// scenes/menu.js
// All non-gameplay screens: main menu, name input, level select,
// victory, game over, and leaderboard.
// ============================================================

import { drawButton, _drawPixelButtonSlices } from '../common/utils.js';

// ---------------------------------------------------------------------------
// Scroll card — 9-slice medieval parchment card
// ---------------------------------------------------------------------------

// Source cell size in scroll.png (48×48px sheet, 3×3 cells of 16×16px each)
const SC = 16;

/**
 * Draws a medieval parchment scroll card using 9-slice scaling.
 * The corners stay at SC×SC while the rolls and borders stretch to fill.
 * Exported so Tutorial / About screens can reuse it.
 *
 * @param {object}        p
 * @param {p5.Image|null} scrollImg  - assets/ui/scroll.png (null = plain fallback)
 * @param {number}        cx         - center X
 * @param {number}        cy         - center Y
 * @param {number}        w          - total card width
 * @param {number}        h          - total card height
 */
export function drawScrollCard(p, scrollImg, cx, cy, w, h) {
    if (!scrollImg) {
        p.push();
        p.fill(205, 162, 90, 220);
        p.stroke(65, 35, 10);
        p.strokeWeight(2);
        p.rectMode(p.CENTER);
        p.rect(cx, cy, w, h, 4);
        p.pop();
        return;
    }

    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    const midW = w - SC * 2;
    const midH = h - SC * 2;

    p.push();
    p.noStroke();
    p.imageMode(p.CORNER);
    p.noTint();

    const cell = (srcCol, srcRow, dx, dy, dw, dh) =>
        p.image(
            scrollImg,
            x0 + dx,
            y0 + dy,
            dw,
            dh,
            srcCol * SC,
            srcRow * SC,
            SC,
            SC,
        );

    // Top row
    cell(0, 0, 0, 0, SC, SC);
    cell(1, 0, SC, 0, midW, SC);
    cell(2, 0, SC + midW, 0, SC, SC);
    // Middle rows
    cell(0, 1, 0, SC, SC, midH);
    cell(1, 1, SC, SC, midW, midH);
    cell(2, 1, SC + midW, SC, SC, midH);
    // Bottom row
    cell(0, 2, 0, SC + midH, SC, SC);
    cell(1, 2, SC, SC + midH, midW, SC);
    cell(2, 2, SC + midW, SC + midH, SC, SC);

    p.pop();
}

// ---------------------------------------------------------------------------
// Main Menu
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}   params.playerName
 * @param {function} params.onPlay
 * @param {function} params.onChangePlayer
 * @param {function} params.onLeaderboard
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]
 */
export function drawMainMenu(
    p,
    { playerName, onPlay, onChangePlayer, onLeaderboard, fonts, assets },
) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(200);

    p.fill(80);
    p.text('Torchbound', p.windowWidth / 2, p.windowHeight / 2 - 240);
    p.fill(255);
    p.text('Torchbound', p.windowWidth / 2, p.windowHeight / 2 - 250);

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(20);
    p.fill(200);
    p.text(
        `Logged in as: ${playerName || 'Guest'}`,
        p.windowWidth / 2,
        p.windowHeight / 2 - 10,
    );

    drawButton(
        p,
        'PLAY',
        p.windowWidth / 2,
        p.windowHeight / 2 + 50,
        onPlay,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'CHANGE PLAYER',
        p.windowWidth / 2,
        p.windowHeight / 2 + 120,
        onChangePlayer,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'LEADERBOARDS',
        p.windowWidth / 2,
        p.windowHeight / 2 + 190,
        onLeaderboard,
        300,
        50,
        fonts,
        assets,
    );
}

// ---------------------------------------------------------------------------
// Name Input
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}   params.playerName
 * @param {function} params.onBack
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]
 */
export function drawNameInput(p, { playerName, onBack, fonts, assets }) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(48);
    p.fill(80);
    p.text('ENTER YOUR NAME', p.windowWidth / 2, p.windowHeight / 2 - 100);
    p.fill(255);
    p.text('ENTER YOUR NAME', p.windowWidth / 2, p.windowHeight / 2 - 103);

    p.textSize(48);
    p.fill(255, 255, 0);
    p.text(
        playerName + (p.frameCount % 30 < 15 ? '_' : ''),
        p.windowWidth / 2,
        p.windowHeight / 2,
    );

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(18);
    p.fill(150);
    p.text(
        'Type your name and press ENTER to continue',
        p.windowWidth / 2,
        p.windowHeight / 2 + 80,
    );

    drawButton(
        p,
        'BACK TO MENU',
        p.windowWidth / 2,
        p.windowHeight - 80,
        onBack,
        300,
        50,
        fonts,
        assets,
    );
}

// ---------------------------------------------------------------------------
// Level Select
// ---------------------------------------------------------------------------

/**
 * Draws the level selection screen.
 * Unlocked levels use the full pixel button.
 * Locked levels show a dimmed pixel button with the dungeon lock sprite.
 *
 * @param {object} p
 * @param {object} params
 * @param {object}   params.levels
 * @param {number}   params.maxUnlockedLevel
 * @param {function} params.onSelect
 * @param {function} params.onBack
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]  - { buttonTiles, lockImg }
 */
export function drawLevelSelect(
    p,
    { levels, maxUnlockedLevel, onSelect, onBack, fonts, assets },
) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(64);
    p.fill(80);
    p.text('SELECT A LEVEL', p.windowWidth / 2, 103);
    p.fill(255);
    p.text('SELECT A LEVEL', p.windowWidth / 2, 100);

    const levelCount = Object.keys(levels).length;
    const btnW = 400;
    const btnH = 50;

    for (let i = 1; i <= levelCount; i++) {
        const unlocked = i <= maxUnlockedLevel;
        const cy = 150 + i * 80;
        const cx = p.windowWidth / 2;

        if (unlocked) {
            drawButton(
                p,
                `Level ${i}: ${levels[i].name}`,
                cx,
                cy,
                () => onSelect(i),
                btnW,
                btnH,
                fonts,
                assets,
            );
        } else {
            drawLockedButton(
                p,
                cx,
                cy,
                btnW,
                btnH,
                i,
                levels[i].name,
                fonts,
                assets,
            );
        }
    }

    drawButton(
        p,
        'BACK',
        p.windowWidth / 2,
        p.windowHeight - 80,
        onBack,
        300,
        50,
        fonts,
        assets,
    );
}

/**
 * Draws a non-interactive locked-level button.
 * Renders the pixel button art with a dim tint, plus the lock sprite.
 */
function drawLockedButton(
    p,
    cx,
    cy,
    btnW,
    btnH,
    levelNum,
    levelName,
    fonts,
    assets,
) {
    const img = assets?.buttonTiles ?? null;
    const lockImg = assets?.lockImg ?? null;
    const label = `Level ${levelNum}: ${levelName}`;

    p.push();

    // 1. Draw Button Background
    if (img) {
        p.tint(80, 50, 80, 180);
        _drawPixelButtonSlices(p, img, cx, cy, btnW, btnH, false);
        p.noTint();
    } else {
        p.fill(30);
        p.rectMode(p.CENTER);
        p.rect(cx, cy, btnW, btnH, 5);
    }

    // 2. Setup Font for measurement
    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(18);

    // 3. Calculate Centering Offset
    const lockSize = btnH * 0.7;
    const spacing = 10;
    const textW = p.textWidth(label);
    const totalContentWidth = lockSize + spacing + textW;
    const startX = cx - totalContentWidth / 2;

    // 4. Draw Lock Icon
    p.imageMode(p.CENTER);
    const lockCenterX = startX + lockSize / 2;

    if (lockImg) {
        p.image(lockImg, lockCenterX, cy, lockSize, lockSize);
    } else {
        p.textAlign(p.CENTER, p.CENTER);
        p.text('🔒', lockCenterX, cy);
    }

    // 5. Draw Level Label
    p.fill(120, 90, 140);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(label, startX + lockSize + spacing, cy);

    p.pop();
}

// ---------------------------------------------------------------------------
// Victory
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}   params.victoryMessage
 * @param {number}   params.currentLevel
 * @param {object}   params.levels
 * @param {string}   params.playerName
 * @param {Array}    params.topScores      - full list; up to top 5 shown
 * @param {function} params.onContinue
 * @param {function} params.onRetry
 * @param {function} params.onMenu
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]       - { buttonTiles, lockImg, scrollImg }
 */
export function drawVictory(
    p,
    {
        victoryMessage,
        currentLevel,
        levels,
        playerName,
        topScores,
        onContinue,
        onRetry,
        onMenu,
        fonts,
        assets,
    },
) {
    // Cap display at 5 — no pagination
    const displayScores = topScores.slice(0, 5);

    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(108);
    p.fill(80);
    p.text('YOU ESCAPED!', p.windowWidth / 2, p.windowHeight / 2 - 290);
    p.fill(255);
    p.text('YOU ESCAPED!', p.windowWidth / 2, p.windowHeight / 2 - 295);

    p.textSize(28);
    p.text(victoryMessage, p.windowWidth / 2, p.windowHeight / 2 - 200);

    // ── Scroll card ───────────────────────────────────────
    // Wraps the "Top Survivors" heading (windowHeight/2-120) through to
    // the last entry row. Each entry is 35px apart; 5 entries span 4 gaps.
    const entryCount = displayScores.length;
    const listHeadY = p.windowHeight / 2 - 120; // heading center
    const listBotY = p.windowHeight / 2 - 70 + Math.max(0, entryCount - 1) * 35;
    const cardPadV = 50;
    const cardW = 500;
    const cardCY = (listHeadY + listBotY) / 2;
    const cardH = Math.max(listBotY - listHeadY + cardPadV * 2, SC * 4);

    drawScrollCard(
        p,
        assets?.scrollImg ?? null,
        p.windowWidth / 2,
        cardCY,
        cardW,
        cardH,
    );

    // ── Content drawn on top of scroll ───────────────────
    // Heading
    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(28);
    p.fill(65, 35, 10);
    p.text(
        `Top Survivors - ${levels[currentLevel].name}`,
        p.windowWidth / 2,
        p.windowHeight / 2 - 120,
    );

    // Entries
    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(24);
    displayScores.forEach((entry, i) => {
        const yPos = p.windowHeight / 2 - 70 + i * 35;
        const isCurrentPlayer = entry.name === playerName;
        // Alternating row tint
        if (i % 2 === 1) {
            p.push();
            p.fill(190, 148, 78, 55);
            p.noStroke();
            p.rectMode(p.CENTER);
            p.rect(p.windowWidth / 2, yPos, cardW - SC * 2, 35);
            p.pop();
        }
        p.fill(isCurrentPlayer ? [160, 90, 10] : [55, 28, 8]);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(
            isCurrentPlayer
                ? `> ${i + 1}. ${entry.name}: ${entry.score} <`
                : `${i + 1}. ${entry.name}: ${entry.score}`,
            p.windowWidth / 2,
            yPos,
        );
    });

    drawButton(
        p,
        'CONTINUE',
        p.windowWidth / 2 - 325,
        p.windowHeight / 2 + 200,
        onContinue,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'RETRY',
        p.windowWidth / 2,
        p.windowHeight / 2 + 200,
        onRetry,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'MENU',
        p.windowWidth / 2 + 325,
        p.windowHeight / 2 + 200,
        onMenu,
        300,
        50,
        fonts,
        assets,
    );
}

// ---------------------------------------------------------------------------
// Game Over
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}   params.lossReason
 * @param {function} params.onRetry
 * @param {function} params.onLevels
 * @param {function} params.onMenu
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]
 */
export function drawGameOver(
    p,
    { lossReason, onRetry, onLevels, onMenu, fonts, assets },
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
    p.text(`${lossReason}`, p.windowWidth / 2, p.windowHeight / 2 - 50);

    drawButton(
        p,
        'RETRY',
        p.windowWidth / 2 - 325,
        p.windowHeight / 2 + 50,
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
        p.windowWidth / 2 + 325,
        p.windowHeight / 2 + 50,
        onMenu,
        300,
        50,
        fonts,
        assets,
    );
}

// ---------------------------------------------------------------------------
// Leaderboard  (Hall of Fame) — top 10, no pagination
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}        params.playerName
 * @param {string|number} params.leaderboardView
 * @param {Array}         params.data            - up to top 10
 * @param {function}      params.onViewChange
 * @param {function}      params.onBack
 * @param {object}        [params.fonts]
 * @param {object}        [params.assets]        - { buttonTiles, lockImg, scrollImg }
 */
export function drawLeaderboard(
    p,
    { playerName, leaderboardView, data, onViewChange, onBack, fonts, assets },
) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(96);
    p.fill(80);
    p.text('HALL OF FAME', p.windowWidth / 2, 103);
    p.fill(255);
    p.text('HALL OF FAME', p.windowWidth / 2, 100);

    const labels = ['OVERALL', 'LV 1', 'LV 2', 'LV 3', 'LV 4', 'LV 5'];
    const views = ['overall', 1, 2, 3, 4, 5];
    const btnW = 120;
    const gap = 20;
    const totalRowWidth = views.length * btnW + (views.length - 1) * gap;
    const startX = p.windowWidth / 2 - totalRowWidth / 2 + btnW / 2;

    views.forEach((v, i) => {
        drawButton(
            p,
            labels[i],
            startX + i * (btnW + gap),
            200,
            () => onViewChange(v),
            btnW,
            40,
            fonts,
            assets,
        );
    });

    // ── Scroll card ───────────────────────────────────────
    // Wraps the subheading (y=300) through the last entry.
    // Entries start at y=340, each 40px apart, up to 10 entries.
    const entryCount = data.length;
    const listHeadY = 300; // subheading center y
    const listBotY = entryCount > 0 ? 340 + (entryCount - 1) * 40 : 340;
    const cardPadV = 50;
    const cardW = 600;
    const cardCY = (listHeadY + listBotY) / 2;
    const cardH = Math.max(listBotY - listHeadY + cardPadV * 2, SC * 4);

    drawScrollCard(
        p,
        assets?.scrollImg ?? null,
        p.windowWidth / 2,
        cardCY,
        cardW,
        cardH,
    );

    // ── Content drawn on top of scroll ───────────────────
    // Subheading
    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(24);
    p.fill(65, 35, 10);
    p.text(
        leaderboardView === 'overall'
            ? 'Total Cumulative Scores'
            : `Level ${leaderboardView} Top Times`,
        p.windowWidth / 2,
        300,
    );

    // Entries
    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(24);

    if (data.length === 0) {
        p.fill(100, 65, 20);
        p.text('No records yet...', p.windowWidth / 2, 340);
    }

    data.forEach((entry, i) => {
        const yPos = 340 + i * 40;
        // Alternating row tint
        if (i % 2 === 1) {
            p.push();
            p.fill(190, 148, 78, 55);
            p.noStroke();
            p.rectMode(p.CENTER);
            p.rect(p.windowWidth / 2, yPos, cardW - SC * 2, 40);
            p.pop();
        }
        p.fill(entry.name === playerName ? [160, 90, 10] : [55, 28, 8]);
        if (fonts?.body) p.textFont(fonts.body);
        p.textSize(24);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(
            `${i + 1}. ${entry.name}: ${entry.score}`,
            p.windowWidth / 2,
            yPos,
        );
    });

    drawButton(
        p,
        'BACK',
        p.windowWidth / 2,
        p.windowHeight - 80,
        onBack,
        300,
        50,
        fonts,
        assets,
    );
}
