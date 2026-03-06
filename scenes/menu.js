// ============================================================
// scenes/menu.js
// All non-gameplay screens: main menu, name input, level select,
// victory, game over, and leaderboard.
// ============================================================

import { drawButton } from '../common/utils.js';

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
 */
export function drawMainMenu(
    p,
    { playerName, onPlay, onChangePlayer, onLeaderboard },
) {
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(255);
    p.textSize(64);
    p.text('TORCHBOUND', p.windowWidth / 2, p.windowHeight / 2 - 80);

    p.textSize(20);
    p.fill(200);
    p.text(
        `Logged in as: ${playerName || 'Guest'}`,
        p.windowWidth / 2,
        p.windowHeight / 2 - 10,
    );

    drawButton(p, 'PLAY', p.windowWidth / 2, p.windowHeight / 2 + 50, onPlay);
    drawButton(
        p,
        'CHANGE PLAYER',
        p.windowWidth / 2,
        p.windowHeight / 2 + 120,
        onChangePlayer,
    );
    drawButton(
        p,
        'LEADERBOARDS',
        p.windowWidth / 2,
        p.windowHeight / 2 + 190,
        onLeaderboard,
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
 */
export function drawNameInput(p, { playerName, onBack }) {
    p.textAlign(p.CENTER, p.CENTER);
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
    );
}

// ---------------------------------------------------------------------------
// Level Select
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {object}   params.levels  - LEVELS config object
 * @param {function} params.onSelect - (levelIndex) => void
 * @param {function} params.onBack
 */
export function drawLevelSelect(p, { levels, onSelect, onBack }) {
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(255);
    p.textSize(32);
    p.text('SELECT A LEVEL', p.windowWidth / 2, 100);

    for (let i = 1; i <= Object.keys(levels).length; i++) {
        drawButton(
            p,
            `Level ${i}: ${levels[i].name}`,
            p.windowWidth / 2,
            100 + i * 80,
            () => onSelect(i),
        );
    }

    drawButton(p, 'BACK', p.windowWidth / 2, p.windowHeight - 80, onBack);
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
    },
) {
    p.background(0, 50, 0);
    p.textAlign(p.CENTER, p.CENTER);

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
    );
    drawButton(p, 'RETRY', p.windowWidth / 2, p.windowHeight / 2 + 50, onRetry);
    drawButton(
        p,
        'MENU',
        p.windowWidth / 2 + 325,
        p.windowHeight / 2 + 50,
        onMenu,
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
 */
export function drawGameOver(p, { lossReason, onRetry, onLevels, onMenu }) {
    p.background(50, 0, 0);
    p.textAlign(p.CENTER, p.CENTER);

    p.fill(255);
    p.textSize(48);
    p.text('GAME OVER', p.windowWidth / 2, p.windowHeight / 2 - 100);

    p.textSize(24);
    p.fill(200);
    p.text(`Cause: ${lossReason}`, p.windowWidth / 2, p.windowHeight / 2 - 30);

    drawButton(
        p,
        'RETRY',
        p.windowWidth / 2 - 325,
        p.windowHeight / 2 + 50,
        onRetry,
    );
    drawButton(
        p,
        'LEVELS',
        p.windowWidth / 2,
        p.windowHeight / 2 + 50,
        onLevels,
    );
    drawButton(
        p,
        'MENU',
        p.windowWidth / 2 + 325,
        p.windowHeight / 2 + 50,
        onMenu,
    );
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}        params.playerName
 * @param {string|number} params.leaderboardView - 'overall' or level number
 * @param {Array}         params.data
 * @param {function}      params.onViewChange - (view) => void
 * @param {function}      params.onBack
 */
export function drawLeaderboard(
    p,
    { playerName, leaderboardView, data, onViewChange, onBack },
) {
    p.textAlign(p.CENTER, p.CENTER);
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
        );
    });

    p.textSize(24);
    p.fill(200);
    p.text(
        leaderboardView === 'overall'
            ? 'Total Cumulative Scores'
            : `Level ${leaderboardView} Top Times`,
        p.windowWidth / 2,
        190,
    );

    if (data.length === 0) {
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

    drawButton(p, 'BACK', p.windowWidth / 2, p.windowHeight - 80, onBack);
}
