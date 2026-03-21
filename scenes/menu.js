// ============================================================
// scenes/menu.js
// All non-gameplay screens: main menu, name input, level select,
// victory, game over, and leaderboard.
// ============================================================

import { drawButton, _drawPixelButtonSlices } from '../common/utils.js';

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
    p.fill(255);
    p.textSize(64);
    p.text('TORCHBOUND', p.windowWidth / 2, p.windowHeight / 2 - 80);

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
    p.fill(255);
    p.textSize(32);
    p.text('ENTER YOUR NAME', p.windowWidth / 2, p.windowHeight / 2 - 100);

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
    p.fill(255);
    p.textSize(32);
    p.text('SELECT A LEVEL', p.windowWidth / 2, 100);

    const levelCount = Object.keys(levels).length;
    const btnW = 300;
    const btnH = 50;

    for (let i = 1; i <= levelCount; i++) {
        const unlocked = i <= maxUnlockedLevel;
        const cy = 100 + i * 80;
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

    p.push();

    if (img) {
        p.tint(80, 50, 80, 180);
        _drawPixelButtonSlices(p, img, cx, cy, btnW, btnH, false);
        p.noTint();
    } else {
        p.fill(30);
        p.rectMode(p.CENTER);
        p.noStroke();
        p.rect(cx, cy, btnW, btnH, 5);
    }

    // Lock icon
    const lockSize = btnH * 0.7;
    const lockX = cx - btnW / 2 + btnH * 0.65;

    if (lockImg) {
        p.imageMode(p.CENTER);
        p.noTint();
        p.image(lockImg, lockX, cy, lockSize, lockSize);
    } else {
        if (fonts?.body) p.textFont(fonts.body);
        p.fill(120, 80, 120);
        p.textSize(18);
        p.textAlign(p.LEFT, p.CENTER);
        p.text('🔒', lockX - 10, cy);
    }

    // Level label — dimmed body text
    if (fonts?.body) p.textFont(fonts.body);
    p.fill(120, 90, 140);
    p.textSize(18);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(`Level ${levelNum}: ${levelName}`, lockX + lockSize * 0.6 + 4, cy);

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
 * @param {Array}    params.topScores
 * @param {function} params.onContinue
 * @param {function} params.onRetry
 * @param {function} params.onMenu
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]
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
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.fill(255);
    p.textSize(48);
    p.text('YOU ESCAPED!', p.windowWidth / 2, p.windowHeight / 2 - 80);

    p.textSize(24);
    p.text(victoryMessage, p.windowWidth / 2, p.windowHeight / 2 - 20);

    p.fill(200);
    p.text(
        `Top Survivors - ${levels[currentLevel].name}`,
        p.windowWidth / 2,
        130,
    );

    if (fonts?.body) p.textFont(fonts.body);
    topScores.forEach((entry, i) => {
        const yPos = 180 + i * 35;
        const isCurrentPlayer = entry.name === playerName;
        p.fill(isCurrentPlayer ? [255, 255, 0] : 255);
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
        p.windowHeight / 2 + 50,
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
    p.fill(255);
    p.textSize(48);
    p.text('GAME OVER', p.windowWidth / 2, p.windowHeight / 2 - 100);

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(24);
    p.fill(200);
    p.text(`Cause: ${lossReason}`, p.windowWidth / 2, p.windowHeight / 2 - 30);

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
// Leaderboard
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}        params.playerName
 * @param {string|number} params.leaderboardView
 * @param {Array}         params.data
 * @param {function}      params.onViewChange
 * @param {function}      params.onBack
 * @param {object}        [params.fonts]
 * @param {object}        [params.assets]
 */
export function drawLeaderboard(
    p,
    { playerName, leaderboardView, data, onViewChange, onBack, fonts, assets },
) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.fill(255);
    p.textSize(42);
    p.text('HALL OF FAME', p.windowWidth / 2, 60);

    const labels = ['OVERALL', 'LV 1', 'LV 2', 'LV 3', 'LV 4', 'LV 5'];
    const views = ['overall', 1, 2, 3, 4, 5];
    views.forEach((v, i) => {
        drawButton(
            p,
            labels[i],
            p.windowWidth / 2 - 250 + i * 100,
            130,
            () => onViewChange(v),
            90,
            40,
            fonts,
            assets,
        );
    });

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(24);
    p.fill(200);
    p.text(
        leaderboardView === 'overall'
            ? 'Total Cumulative Scores'
            : `Level ${leaderboardView} Top Times`,
        p.windowWidth / 2,
        190,
    );

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(24);

    if (data.length === 0) {
        p.fill(200);
        p.text('No records yet...', p.windowWidth / 2, 250);
    }

    data.forEach((entry, i) => {
        p.fill(entry.name === playerName ? [255, 255, 0] : 255);
        p.text(
            `${i + 1}. ${entry.name}: ${entry.score}`,
            p.windowWidth / 2,
            240 + i * 40,
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
