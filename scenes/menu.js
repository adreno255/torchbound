// ============================================================
// scenes/menu.js
// All non-gameplay screens: main menu, accounts, level select,
// victory, game over, leaderboard, and tutorial prompt.
// ============================================================

import { drawButton, _drawPixelButtonSlices } from '../common/utils.js';

// ---------------------------------------------------------------------------
// Scroll card — 9-slice medieval parchment card
// ---------------------------------------------------------------------------

const SC = 16;

/**
 * Draws a medieval parchment scroll card using 9-slice scaling.
 *
 * @param {object}        p
 * @param {p5.Image|null} scrollImg
 * @param {number}        cx
 * @param {number}        cy
 * @param {number}        w
 * @param {number}        h
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
// Player ID overlay — bottom-left corner of every non-playing screen
// Includes a clickable copy icon button.
// ---------------------------------------------------------------------------

// Hit-area constants (module-level so mousePressed in main can query them)
const PID_ICON_SIZE = 18;
const PID_PAD_LEFT = 12;
const PID_PAD_BOT = 10;

/**
 * Draws the active player's Player ID in the bottom-left corner with a
 * copy icon button next to it.  Registers a pointer hover when the icon
 * is hovered, and fires onCopy when it is clicked.
 *
 * @param {object} p
 * @param {object} params
 * @param {string}   params.playerId
 * @param {function} params.onCopy       - called when copy icon is clicked
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]     - expects assets.copyIcon (p5.Image)
 */
export function drawPlayerIdOverlay(p, { playerId, onCopy, fonts, assets }) {
    if (!playerId) return;

    p.push();
    p.resetMatrix();

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(13);
    p.textAlign(p.LEFT, p.BOTTOM);

    const textY = p.windowHeight - PID_PAD_BOT;
    const label = `Player ID: ${playerId}`;

    // Shadow then lit text
    p.fill(0, 0, 0, 140);
    p.text(label, PID_PAD_LEFT + 1, textY + 1);
    p.fill(160, 140, 100, 210);
    p.text(label, PID_PAD_LEFT, textY);

    // ── Copy icon ─────────────────────────────────────────────
    const textW = p.textWidth(label);
    const iconX = PID_PAD_LEFT + textW + 6;
    const iconY = textY - PID_ICON_SIZE; // CORNER mode top-left

    const hovered =
        p.mouseX >= iconX &&
        p.mouseX <= iconX + PID_ICON_SIZE &&
        p.mouseY >= iconY &&
        p.mouseY <= iconY + PID_ICON_SIZE;

    if (hovered && typeof p._registerButtonHover === 'function') {
        p._registerButtonHover();
    }

    const copyImg = assets?.copyIcon ?? null;
    p.imageMode(p.CORNER);

    if (copyImg) {
        p.tint(
            hovered ? 255 : 180,
            hovered ? 255 : 200,
            hovered ? 160 : 120,
            hovered ? 255 : 180,
        );
        p.image(copyImg, iconX, iconY, PID_ICON_SIZE, PID_ICON_SIZE);
        p.noTint();
    } else {
        // Fallback: draw a simple clipboard rectangle
        p.noStroke();
        p.fill(hovered ? [255, 230, 140, 220] : [160, 140, 100, 160]);
        p.rect(iconX + 2, iconY + 2, PID_ICON_SIZE - 4, PID_ICON_SIZE - 4, 2);
        p.fill(hovered ? [60, 40, 10, 200] : [30, 20, 5, 140]);
        p.rect(iconX + 5, iconY, PID_ICON_SIZE - 10, 4, 1);
    }

    // Click detection — fire onCopy
    if (hovered && p.mouseIsPressed && onCopy) {
        p.mouseIsPressed = false;
        onCopy();
    }

    p.pop();
}

// ---------------------------------------------------------------------------
// Main Menu
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string|null} params.displayName
 * @param {function}    params.onPlay
 * @param {function}    params.onTutorial
 * @param {function}    params.onAccounts
 * @param {function}    params.onLeaderboard
 * @param {object}      [params.fonts]
 * @param {object}      [params.assets]
 */
export function drawMainMenu(
    p,
    {
        displayName,
        onPlay,
        onTutorial,
        onAccounts,
        onLeaderboard,
        fonts,
        assets,
    },
) {
    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(200);
    p.fill(80);
    p.text('Torchbound', p.windowWidth / 2, p.windowHeight / 2 - 240);
    p.fill(255);
    p.text('Torchbound', p.windowWidth / 2, p.windowHeight / 2 - 250);

    // Only show "Logged in as:" if a player profile exists
    if (displayName) {
        if (fonts?.body) p.textFont(fonts.body);
        p.textSize(20);
        p.fill(200);
        p.text(
            `Logged in as: ${displayName}`,
            p.windowWidth / 2,
            p.windowHeight / 2 - 10,
        );
    }

    const firstBtnY = displayName
        ? p.windowHeight / 2 + 50
        : p.windowHeight / 2 + 30;

    drawButton(
        p,
        'PLAY',
        p.windowWidth / 2,
        firstBtnY,
        onPlay,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'TUTORIAL',
        p.windowWidth / 2,
        firstBtnY + 70,
        onTutorial,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'ACCOUNTS',
        p.windowWidth / 2,
        firstBtnY + 140,
        onAccounts,
        300,
        50,
        fonts,
        assets,
    );
    drawButton(
        p,
        'LEADERBOARDS',
        p.windowWidth / 2,
        firstBtnY + 210,
        onLeaderboard,
        300,
        50,
        fonts,
        assets,
    );
}

// ---------------------------------------------------------------------------
// Account Screen  (CREATE ACCOUNT / SWITCH ACCOUNT)
// ---------------------------------------------------------------------------

/**
 * Unified account screen with two clickable tab buttons.
 *
 * @param {object} p
 * @param {object} params
 * @param {string}   params.draftName      - current typed text (not committed)
 * @param {string}   params.accountTab     - 'create' | 'switch'
 * @param {string}   params.accountError   - error message string, or ''
 * @param {function} params.onSwitchTab    - called with 'create' or 'switch'
 * @param {function} params.onBack         - discard draft, go back to menu
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]
 */
export function drawAccountScreen(
    p,
    { draftName, accountTab, accountError, onSwitchTab, onBack, fonts, assets },
) {
    const cx = p.windowWidth / 2;
    const cy = p.windowHeight / 2;

    const isCreate = accountTab === 'create';
    const maxLen = isCreate ? 12 : 24;
    const charsLeft = maxLen - draftName.length;

    p.textAlign(p.CENTER, p.CENTER);

    // ── Title ─────────────────────────────────────────────────
    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(48);
    p.fill(80);
    p.text(isCreate ? 'CREATE ACCOUNT' : 'SWITCH ACCOUNT', cx, cy - 180);
    p.fill(255);
    p.text(isCreate ? 'CREATE ACCOUNT' : 'SWITCH ACCOUNT', cx, cy - 183);

    // ── Tab buttons ───────────────────────────────────────────
    const tabW = 200;
    const tabH = 38;
    const tabGap = 16;
    const tabY = cy - 130;
    const tabLX = cx - tabW - tabGap / 2; // left tab origin X (CORNER mode)
    const tabRX = cx + tabGap / 2; // right tab origin X

    _drawTabButton(
        p,
        'CREATE',
        tabLX,
        tabY,
        tabW,
        tabH,
        isCreate,
        () => onSwitchTab('create'),
        fonts,
    );
    _drawTabButton(
        p,
        'SWITCH',
        tabRX,
        tabY,
        tabW,
        tabH,
        !isCreate,
        () => onSwitchTab('switch'),
        fonts,
    );

    // ── Input field ───────────────────────────────────────────
    const fieldW = 480;
    const fieldH = 54;
    const fieldY = cy - 50;

    p.push();
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill(20, 14, 8, 220);
    p.rect(cx, fieldY, fieldW, fieldH, 6);
    p.stroke(accountError ? [200, 60, 60] : [88, 60, 28]);
    p.strokeWeight(accountError ? 2 : 1.5);
    p.noFill();
    p.rect(cx, fieldY, fieldW, fieldH, 6);
    p.pop();

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(30);
    p.fill(255, 255, 0);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(draftName + (p.frameCount % 30 < 15 ? '_' : ''), cx, fieldY);

    // ── Character counter ─────────────────────────────────────
    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(13);
    p.textAlign(p.RIGHT, p.TOP);
    p.fill(charsLeft <= 3 ? [255, 120, 60] : [130, 110, 80]);
    p.text(`${charsLeft} left`, cx + fieldW / 2, fieldY + fieldH / 2 + 4);

    // ── Error message ─────────────────────────────────────────
    if (accountError) {
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(17);
        p.fill(255, 90, 90);
        p.text(accountError, cx, fieldY + fieldH / 2 + 28);
    }

    // ── Hint texts ────────────────────────────────────────────
    p.textAlign(p.CENTER, p.CENTER);
    if (fonts?.body) p.textFont(fonts.body);

    const hintEnter = isCreate
        ? 'Type your name and press ENTER to continue'
        : 'Type your Player ID and press ENTER to continue';

    p.textSize(17);
    p.fill(180);
    p.text(hintEnter, cx, cy + 30);

    p.textSize(14);
    p.fill(100);
    p.text(
        'Pressing Back will keep your current account logged in.',
        cx,
        cy + 58,
    );

    // ── Reminder box ─────────────────────────────────────────
    const reminderY = p.windowHeight - 150;
    const reminderW = 560;
    p.push();
    p.rectMode(p.CENTER);
    p.fill(18, 12, 6, 180);
    p.noStroke();
    p.rect(cx, reminderY, reminderW, 68, 6);
    p.stroke(70, 48, 20, 140);
    p.strokeWeight(1);
    p.noFill();
    p.rect(cx, reminderY, reminderW, 68, 6);
    p.pop();

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(13);
    p.fill(160, 130, 80);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(
        'REMINDER: Creating or switching accounts logs you in immediately.',
        cx,
        reminderY - 12,
    );
    p.text(
        'Save your Player ID (bottom-left) to log back into this account later.',
        cx,
        reminderY + 12,
    );

    // ── Back button ───────────────────────────────────────────
    drawButton(
        p,
        'BACK TO MENU',
        cx,
        p.windowHeight - 68,
        onBack,
        300,
        50,
        fonts,
        assets,
    );
}

// ---------------------------------------------------------------------------
// Tab button helper
// Renders a pill-style tab button with hover state and click handling.
// Uses CORNER rect mode (x, y = top-left corner).
// ---------------------------------------------------------------------------

/**
 * @param {object}   p
 * @param {string}   label
 * @param {number}   x        - left edge
 * @param {number}   y        - vertical centre
 * @param {number}   w
 * @param {number}   h
 * @param {boolean}  active   - whether this tab is currently selected
 * @param {function} onClick
 * @param {object}   [fonts]
 */
function _drawTabButton(p, label, x, y, w, h, active, onClick, fonts) {
    // y here is the vertical centre; rect is drawn top-left = (x, y - h/2)
    const rx = x;
    const ry = y - h / 2;

    const hovered =
        p.mouseX >= rx &&
        p.mouseX <= rx + w &&
        p.mouseY >= ry &&
        p.mouseY <= ry + h;

    if (hovered && typeof p._registerButtonHover === 'function') {
        p._registerButtonHover();
    }

    // Background fill
    const isLit = active || hovered;
    p.push();
    p.rectMode(p.CORNER);
    p.noStroke();
    if (active) {
        p.fill(140, 90, 30, 230);
    } else if (hovered) {
        p.fill(80, 52, 18, 220);
    } else {
        p.fill(30, 20, 10, 180);
    }
    p.rect(rx, ry, w, h, 5);

    // Border
    if (active) {
        p.stroke(200, 150, 60, 200);
        p.strokeWeight(1.5);
        p.noFill();
        p.rect(rx, ry, w, h, 5);
    } else if (hovered) {
        p.stroke(140, 100, 40, 140);
        p.strokeWeight(1);
        p.noFill();
        p.rect(rx, ry, w, h, 5);
    }

    // Label
    p.noStroke();
    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(15);
    p.fill(
        active ? [255, 230, 160] : hovered ? [200, 170, 110] : [120, 100, 70],
    );
    p.textAlign(p.CENTER, p.CENTER);
    p.text(label, rx + w / 2, y);
    p.pop();

    // Click
    if (hovered && p.mouseIsPressed && !active) {
        p.mouseIsPressed = false;
        onClick();
    }
}

// ---------------------------------------------------------------------------
// Tutorial Prompt
// ---------------------------------------------------------------------------

export function drawTutorialPrompt(p, { onYes, onNo, fonts, assets }) {
    p.push();
    p.fill(0, 200);
    p.noStroke();
    p.rectMode(p.CORNER);
    p.rect(0, 0, p.windowWidth, p.windowHeight);
    p.pop();

    const cx = p.windowWidth / 2;
    const cy = p.windowHeight / 2;

    const cardW = 520;
    const cardH = 285;
    p.push();
    p.fill(28, 18, 10, 240);
    p.stroke(120, 80, 30);
    p.strokeWeight(2);
    p.rectMode(p.CENTER);
    p.rect(cx, cy, cardW, cardH, 8);
    p.pop();

    p.push();
    p.stroke(200, 140, 40, 160);
    p.strokeWeight(1);
    p.line(cx - 160, cy - 50, cx + 160, cy - 50);
    p.line(cx - 160, cy + 50, cx + 160, cy + 50);
    p.pop();

    p.textAlign(p.CENTER, p.CENTER);

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(36);
    p.fill(80);
    p.text('First Time?', cx, cy - 90);
    p.fill(255, 220, 140);
    p.text('First Time?', cx, cy - 93);

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(20);
    p.fill(200, 185, 155);
    p.text('Would you like to play the Tutorial first?', cx, cy - 20);
    p.textSize(15);
    p.fill(130, 115, 90);
    p.text('You can always replay it from the Main Menu.', cx, cy + 12);

    drawButton(
        p,
        'YES, TEACH ME',
        cx - 110,
        cy + 95,
        onYes,
        200,
        48,
        fonts,
        assets,
    );
    drawButton(p, 'NO THANKS', cx + 110, cy + 95, onNo, 200, 48, fonts, assets);
}

// ---------------------------------------------------------------------------
// Level Select
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {object}   params.levels
 * @param {number}   params.maxUnlockedLevel
 * @param {function} params.onSelect
 * @param {function} params.onBack
 * @param {object}   [params.fonts]
 * @param {object}   [params.assets]
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

    if (img) {
        p.tint(80, 50, 80, 180);
        _drawPixelButtonSlices(p, img, cx, cy, btnW, btnH, false);
        p.noTint();
    } else {
        p.fill(30);
        p.rectMode(p.CENTER);
        p.rect(cx, cy, btnW, btnH, 5);
    }

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(18);

    const lockSize = btnH * 0.7;
    const spacing = 10;
    const textW = p.textWidth(label);
    const totalContentWidth = lockSize + spacing + textW;
    const startX = cx - totalContentWidth / 2;
    const lockCenterX = startX + lockSize / 2;

    p.imageMode(p.CENTER);
    if (lockImg) {
        p.image(lockImg, lockCenterX, cy, lockSize, lockSize);
    } else {
        p.textAlign(p.CENTER, p.CENTER);
        p.text('🔒', lockCenterX, cy);
    }

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
 * @param {string}   params.playerDisplayName          - "username#tag"
 * @param {string}   params.playerCurrentHighScore     - player's current high score in the level
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
        playerDisplayName,
        playerCurrentHighScore,
        topScores,
        onContinue,
        onRetry,
        onMenu,
        fonts,
        assets,
    },
) {
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
    p.text(
        `Current High Score: ${playerCurrentHighScore}`,
        p.windowWidth / 2,
        p.windowHeight / 2 - 170,
    );

    const entryCount = displayScores.length;
    const listHeadY = p.windowHeight / 2 - 80;
    const listBotY = p.windowHeight / 2 - 30 + Math.max(0, entryCount - 1) * 35;
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

    if (fonts?.heading) p.textFont(fonts.heading);
    p.textSize(28);
    p.fill(65, 35, 10);
    p.text(
        `Top Survivors - ${levels[currentLevel].name}`,
        p.windowWidth / 2,
        p.windowHeight / 2 - 80,
    );

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(24);
    displayScores.forEach((entry, i) => {
        const yPos = p.windowHeight / 2 - 30 + i * 35;
        const isCurrentPlayer = entry.name === playerDisplayName;
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
        p.windowHeight / 2 + 240,
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
        p.windowHeight / 2 + 240,
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
        p.windowHeight / 2 + 240,
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
// Leaderboard
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {object} params
 * @param {string}        params.displayName      - "username#tag"
 * @param {string|number} params.leaderboardView
 * @param {Array}         params.data
 * @param {function}      params.onViewChange
 * @param {function}      params.onBack
 * @param {object}        [params.fonts]
 * @param {object}        [params.assets]
 */
export function drawLeaderboard(
    p,
    { displayName, leaderboardView, data, onViewChange, onBack, fonts, assets },
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

    const entryCount = data.length;
    const listHeadY = 300;
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

    if (fonts?.body) p.textFont(fonts.body);
    p.textSize(24);

    if (data.length === 0) {
        p.fill(100, 65, 20);
        p.text('No records yet...', p.windowWidth / 2, 340);
    }

    data.forEach((entry, i) => {
        const yPos = 340 + i * 40;
        if (i % 2 === 1) {
            p.push();
            p.fill(190, 148, 78, 55);
            p.noStroke();
            p.rectMode(p.CENTER);
            p.rect(p.windowWidth / 2, yPos, cardW - SC * 2, 40);
            p.pop();
        }
        p.fill(entry.name === displayName ? [160, 90, 10] : [55, 28, 8]);
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
