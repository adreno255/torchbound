// ============================================================
// main.js
// Entry point and p5.js sketch orchestrator.
// Owns all game state, runs the loop, and wires every module.
// ============================================================

import {
    TILE_SIZE,
    GAME_STATE,
    GAME_PHASE,
    TILE_MAP,
    TORCH_RADIUS_BASE,
} from './common/constants.js';
import { LEVELS } from './common/levels.js';
import { getScaleFactor, calculateScore } from './common/utils.js';
import {
    createPlayer,
    findStartTile,
    movePlayer,
    takeDamage,
    drawPlayer,
    triggerHitAnim,
    triggerFallAnim,
    triggerDimAnim,
    triggerExtinguishAnim,
    setAnim,
} from './entities/player.js';
import { applyCamera, followPlayer } from './entities/camera.js';
import { drawGrid, createFogLayer, renderFog } from './entities/map.js';
import { isTrapActive, checkStandingOnTrap } from './entities/traps.js';
import { checkPowerUps } from './entities/powerups.js';
import {
    drawBackground,
    bgTilesetKey,
    bgTilesetKeyForLevel,
} from './entities/background.js';
import { drawHUD, drawIntroCountdown, drawPauseMenu } from './scenes/game.js';
import {
    drawMainMenu,
    drawNameInput,
    drawLevelSelect,
    drawVictory,
    drawGameOver,
    drawLeaderboard,
} from './scenes/menu.js';
import {
    saveScore,
    getLeaderboard,
    getOverallLeaderboard,
    getSavedPlayerName,
    savePlayerName,
    clearPlayerName,
} from './common/leaderboard.js';

// ============================================================
// Level-unlock helpers (persisted in localStorage)
// ============================================================

const UNLOCK_KEY = 'torchbound_unlocked';

function getMaxUnlockedLevel() {
    return parseInt(localStorage.getItem(UNLOCK_KEY) || '1', 10);
}

function unlockLevel(level) {
    const current = getMaxUnlockedLevel();
    if (level > current) {
        localStorage.setItem(UNLOCK_KEY, String(level));
    }
}

function isLevelUnlocked(level) {
    return level <= getMaxUnlockedLevel();
}

// ============================================================
// Per-level asset mapping
// ============================================================

function assetsForLevel(level) {
    if (level <= 2) {
        return {
            tileset: 'assets/maps/map-light.png',
            traps: 'assets/traps/traps-light.png',
        };
    }
    if (level === 3) {
        return {
            tileset: 'assets/maps/map-dark.png',
            traps: 'assets/traps/traps-light.png',
        };
    }
    if (level === 4) {
        return {
            tileset: 'assets/maps/map-dark.png',
            traps: 'assets/traps/traps-dark.png',
        };
    }
    return {
        tileset: 'assets/maps/map-dark-v2.png',
        traps: 'assets/traps/traps-dark.png',
    };
}

// ============================================================

new p5((p) => {
    // ── Assets ───────────────────────────────────────────────
    let tilesetImg = null;
    let trapSheetImg = null;
    let powerupSheetImg = null;
    let playerImg = null;

    // Background tilesets (keyed by 'light' | 'dark' | 'darkv2')
    const bgTilesets = { light: null, dark: null, darkv2: null };

    // UI assets
    let buttonTilesImg = null;
    let lockImg = null;
    let scrollImg = null; // assets/ui/scroll.png

    // Fonts
    let fontHeading = null;
    let fontBody = null;

    // Pre-loaded image cache
    const imgCache = {};

    // ── State ────────────────────────────────────────────────
    let debugMode = false;
    let scaleFactor = 1;
    let currentLevel = 1;

    let maze, gridColumns, gridRows, worldWidth, worldHeight;
    let fogLayer;

    let enableCamera = true;
    let enableFog = true;
    let torchRadius = TORCH_RADIUS_BASE;

    let timeLeft = 0;
    let lastTimeStamp = 0;
    let timerRunning = true;

    let cameraX = 0;
    let cameraY = 0;

    let gamePhase = GAME_PHASE.INTRO_REVEAL;
    let transitionAlpha = 0;
    let fogOpacity = 0;
    let introTimer = 0;

    let currentGameState = GAME_STATE.MENU;
    let victoryMessage = '';
    let lossReason = '';
    let leaderboardView = 'overall';

    let player = createPlayer();
    let moveTimer = 0;
    let levelScores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let playerName = getSavedPlayerName();

    let trapTimer = 0;
    let trapDamageTimer = 0;
    let darknessEffectTimer = 0;
    let torchEffectTimer = 0;
    let visionEffectTimer = 0;
    let timeBonusTextTimer = 0;

    let pendingReset = false;
    let resetDelayTimer = 0;
    const FALL_ANIM_MS = 5 * 160;

    let pendingGameOver = false;
    let gameOverDelayTimer = 0;

    let wasDark = false;

    // ── Screen-space effects ──────────────────────────────────
    let hitFlashTimer = 0;
    const HIT_FLASH_MS = 350;
    let shakeTimer = 0;
    const SHAKE_MS = 280;
    const SHAKE_MAG = 5;

    let visionTransitionAlpha = 1;
    let visionPanDir = 0;
    const VISION_PAN_MS = 600;

    // ── Cursor tracking ───────────────────────────────────────
    // We set cursor:pointer whenever the mouse is over any button.
    // drawButton() calls this to register hover rectangles each frame,
    // and at the end of draw() we flip the CSS cursor accordingly.
    let _anyButtonHovered = false;

    /**
     * Called by drawButton (via utils.js) to tell main.js the cursor
     * should be a pointer this frame. We expose it on the p instance
     * so utils.js can reach it without a circular import.
     */
    p._registerButtonHover = () => {
        _anyButtonHovered = true;
    };

    // ── Bundle helpers ────────────────────────────────────────

    function getFonts() {
        return { heading: fontHeading, body: fontBody };
    }

    function getAssets() {
        return { buttonTiles: buttonTilesImg, lockImg, scrollImg };
    }

    function getBgTilesets() {
        return bgTilesets;
    }

    // ── p5 Preload ───────────────────────────────────────────

    p.preload = () => {
        const paths = [
            'assets/maps/map-light.png',
            'assets/maps/map-dark.png',
            'assets/maps/map-dark-v2.png',
            'assets/traps/traps-light.png',
            'assets/traps/traps-dark.png',
            'assets/powerups/powerups.png',
            'assets/player/player.png',
        ];

        for (const path of paths) {
            imgCache[path] = p.loadImage(
                path,
                () => console.log(`Loaded: ${path}`),
                () => console.warn(`Not found: ${path}`),
            );
        }

        // Background tilesets — same files, separate references for the bg system
        bgTilesets.light = p.loadImage('assets/maps/map-light.png', null, () =>
            console.warn('bg map-light missing'),
        );
        bgTilesets.dark = p.loadImage('assets/maps/map-dark.png', null, () =>
            console.warn('bg map-dark missing'),
        );
        bgTilesets.darkv2 = p.loadImage(
            'assets/maps/map-dark-v2.png',
            null,
            () => console.warn('bg map-dark-v2 missing'),
        );

        // UI assets
        buttonTilesImg = p.loadImage(
            'assets/ui/button-tiles.png',
            () => console.log('Loaded: button-tiles.png'),
            () => console.warn('Not found: assets/ui/button-tiles.png'),
        );
        lockImg = p.loadImage(
            'assets/ui/lock.png',
            () => console.log('Loaded: lock.png'),
            () => console.warn('Not found: assets/ui/lock.png'),
        );
        scrollImg = p.loadImage(
            'assets/ui/scroll.png',
            () => console.log('Loaded: scroll.png'),
            () => console.warn('Not found: assets/ui/scroll.png'),
        );

        // Fonts
        fontHeading = p.loadFont(
            'assets/fonts/alagard.ttf',
            () => console.log('Loaded: alagard.ttf'),
            () => console.warn('Not found: assets/fonts/alagard.ttf'),
        );
        fontBody = p.loadFont(
            'assets/fonts/determination.ttf',
            () => console.log('Loaded: determination.ttf'),
            () => console.warn('Not found: assets/fonts/determination.ttf'),
        );
    };

    // ── p5 Core ──────────────────────────────────────────────

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.pixelDensity(1);
        p.noSmooth();
        scaleFactor = getScaleFactor(p);
        powerupSheetImg = imgCache['assets/powerups/powerups.png'] || null;
        playerImg = imgCache['assets/player/player.png'] || null;
    };

    p.draw = () => {
        // Reset hover flag at the start of each frame
        _anyButtonHovered = false;

        const currentTime = p.millis();
        let dt = currentTime - lastTimeStamp;
        lastTimeStamp = currentTime;

        if (currentGameState === GAME_STATE.PAUSED) dt = 0;

        // ── Background ────────────────────────────────────────
        // PLAYING        → plain black (game world fills the screen)
        // PAUSED /
        // VICTORY /
        // GAMEOVER       → brick bg matching the current level's tileset
        // All menus      → brick bg driven by highest unlocked level
        if (currentGameState === GAME_STATE.PLAYING) {
            p.background(0);
        } else {
            const useLevelKey =
                currentGameState === GAME_STATE.PAUSED ||
                currentGameState === GAME_STATE.VICTORY ||
                currentGameState === GAME_STATE.GAMEOVER;

            drawBackground(p, {
                scrollOffset: currentTime,
                tilesetKey: useLevelKey
                    ? bgTilesetKeyForLevel(currentLevel)
                    : bgTilesetKey(getMaxUnlockedLevel()),
                tilesets: getBgTilesets(),
            });
        }

        if (
            currentGameState === GAME_STATE.PLAYING ||
            currentGameState === GAME_STATE.PAUSED
        ) {
            p.push();
            drawGameWorld();
            p.pop();

            // ── Red vignette ──────────────────────────────────
            if (hitFlashTimer > 0) {
                hitFlashTimer -= Math.min(p.deltaTime, 50);
                const t = Math.max(0, hitFlashTimer / HIT_FLASH_MS);
                const a = Math.pow(t, 0.5) * 200;
                p.push();
                p.noStroke();
                const edgeW = p.windowWidth * 0.1;
                const edgeH = p.windowHeight * 0.1;
                drawVignetteEdge(p, 0, 0, edgeW, p.windowHeight, a, 'left');
                drawVignetteEdge(
                    p,
                    p.windowWidth - edgeW,
                    0,
                    edgeW,
                    p.windowHeight,
                    a,
                    'right',
                );
                drawVignetteEdge(p, 0, 0, p.windowWidth, edgeH, a, 'top');
                drawVignetteEdge(
                    p,
                    0,
                    p.windowHeight - edgeH,
                    p.windowWidth,
                    edgeH,
                    a,
                    'bottom',
                );
                p.pop();
            }

            drawHUD(p, {
                player,
                timeLeft,
                timeBonusTextTimer,
                debugMode,
                fonts: getFonts(),
            });

            if (currentGameState === GAME_STATE.PAUSED) {
                // Draw brick background over the game world so the maze
                // is hidden behind the pause screen (same key as above).
                drawBackground(p, {
                    scrollOffset: currentTime,
                    tilesetKey: bgTilesetKeyForLevel(currentLevel),
                    tilesets: getBgTilesets(),
                });
                p.push();
                drawPauseMenu(p, {
                    onResume: () => {
                        currentGameState = GAME_STATE.PLAYING;
                        timerRunning = true;
                        lastTimeStamp = p.millis();
                    },
                    onRetry: () => {
                        loadLevel(currentLevel);
                        currentGameState = GAME_STATE.PLAYING;
                        p.loop();
                    },
                    onLevels: () => {
                        currentGameState = GAME_STATE.LEVEL_SELECT;
                    },
                    onMenu: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
                    fonts: getFonts(),
                    assets: getAssets(),
                });
                p.pop();
            } else {
                handleGameplayLogic(dt);
            }
        } else {
            p.push();
            drawScreen();
            p.pop();
        }

        // ── Cursor update ──────────────────────────────────────
        // Set CSS cursor based on whether any button was hovered this frame.
        p.canvas.style.cursor = _anyButtonHovered ? 'pointer' : 'default';
    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        scaleFactor = getScaleFactor(p);
    };

    // ── Keyboard ─────────────────────────────────────────────

    p.keyPressed = () => {
        if (currentGameState === GAME_STATE.NAME_INPUT) {
            if (p.keyCode === p.ENTER) {
                if (playerName.trim().length > 0) {
                    savePlayerName(playerName.trim());
                    currentGameState = GAME_STATE.LEVEL_SELECT;
                }
            } else if (p.keyCode === p.BACKSPACE) {
                playerName = playerName.slice(0, -1);
            } else if (p.key.length === 1 && playerName.length < 12) {
                playerName += p.key;
            }
            return;
        }

        if (p.key === 'p' || p.key === 'P' || p.keyCode === 27) {
            if (currentGameState === GAME_STATE.PLAYING) {
                currentGameState = GAME_STATE.PAUSED;
                timerRunning = false;
            } else if (currentGameState === GAME_STATE.PAUSED) {
                currentGameState = GAME_STATE.PLAYING;
                timerRunning = true;
                lastTimeStamp = p.millis();
            }
        }

        if (p.key === '0') debugMode = !debugMode;

        if (debugMode) {
            if (p.key === '1') loadLevel(1);
            if (p.key === '2') loadLevel(2);
            if (p.key === '3') loadLevel(3);
            if (p.key === 'm' || p.key === 'M') enableCamera = !enableCamera;
            if (p.key === 'f' || p.key === 'F') enableFog = !enableFog;
        }
    };

    // ── Screen-effect helpers ─────────────────────────────────

    function drawVignetteEdge(p, x, y, w, h, maxAlpha, side) {
        const STEPS = 10;
        for (let i = 0; i < STEPS; i++) {
            const t = 1 - i / STEPS;
            const a = maxAlpha * t * t;
            p.fill(180, 0, 0, a);
            if (side === 'left') p.rect(x + (w / STEPS) * i, y, w / STEPS, h);
            else if (side === 'right')
                p.rect(x + w - (w / STEPS) * (i + 1), y, w / STEPS, h);
            else if (side === 'top')
                p.rect(x, y + (h / STEPS) * i, w, h / STEPS);
            else p.rect(x, y + h - (h / STEPS) * (i + 1), w, h / STEPS);
        }
    }

    // ── Level Loading ─────────────────────────────────────────

    function loadLevel(difficulty) {
        if (!LEVELS[difficulty]) return;

        const assets = assetsForLevel(difficulty);
        tilesetImg = imgCache[assets.tileset] || null;
        trapSheetImg = imgCache[assets.traps] || null;

        const levelData = LEVELS[difficulty];
        maze = levelData.maze;
        gridRows = maze.length;
        gridColumns = maze[0].length;
        worldWidth = gridColumns * TILE_SIZE;
        worldHeight = gridRows * TILE_SIZE;

        fogLayer = createFogLayer(p, worldWidth, worldHeight);

        player = createPlayer();
        findStartTile(player, maze, gridRows, gridColumns);

        resetTimers(levelData.time);

        gamePhase = GAME_PHASE.INTRO_REVEAL;
        transitionAlpha = 0;
        fogOpacity = 0;
        introTimer = 0;
    }

    function resetTimers(levelTime) {
        timeLeft = levelTime;
        lastTimeStamp = p.millis();
        timerRunning = true;
        introTimer = 0;
        moveTimer = 0;
        trapTimer = 0;
        trapDamageTimer = 0;
        darknessEffectTimer = 0;
        torchEffectTimer = 0;
        visionEffectTimer = 0;
        timeBonusTextTimer = 0;
        pendingReset = false;
        resetDelayTimer = 0;
        pendingGameOver = false;
        gameOverDelayTimer = 0;
        wasDark = false;
        hitFlashTimer = 0;
        shakeTimer = 0;
        visionTransitionAlpha = 1;
        visionPanDir = 0;
    }

    // ── World Rendering ───────────────────────────────────────

    function drawGameWorld() {
        const safeDt = Math.min(p.deltaTime, 50);
        introTimer += safeDt;

        handleGamePhase(safeDt);

        // Screen shake
        if (shakeTimer > 0) {
            shakeTimer -= safeDt;
            const env = Math.max(0, shakeTimer / SHAKE_MS);
            const mag = SHAKE_MAG * env;
            p.translate(p.random(-mag, mag), p.random(-mag, mag));
        }

        // Vision powerup pan
        if (visionPanDir !== 0) {
            const step = safeDt / VISION_PAN_MS;
            visionTransitionAlpha = p.constrain(
                visionTransitionAlpha + visionPanDir * step,
                0,
                1,
            );
            if (visionTransitionAlpha <= 0 || visionTransitionAlpha >= 1) {
                visionPanDir = 0;
            }
        }

        const effectiveAlpha =
            visionPanDir !== 0 || visionTransitionAlpha < 1
                ? visionTransitionAlpha
                : transitionAlpha;

        if (enableCamera) {
            ({ cameraX, cameraY } = followPlayer(p, {
                cameraX,
                cameraY,
                player,
                worldWidth,
                worldHeight,
            }));
        }

        applyCamera(p, {
            enableCamera,
            scaleFactor,
            worldWidth,
            worldHeight,
            transitionAlpha: effectiveAlpha,
            player,
            cameraX,
            cameraY,
        });

        drawGrid(p, {
            maze,
            gridRows,
            gridColumns,
            isTrapActiveFn: (tile, x, y) => isTrapActive(tile, x, y, trapTimer),
            trapTimer,
            millis: p.millis(),
            tilesetImg,
            trapSheetImg,
            powerupSheetImg,
        });
        drawPlayer(p, player, playerImg, safeDt);
        drawIntroCountdown(p, {
            gamePhase,
            introTimer,
            fogOpacity,
            fonts: getFonts(),
        });

        renderFog(p, fogLayer, {
            enableFog,
            enableCamera,
            gamePhase,
            fogOpacity,
            player,
            gridRows,
            gridColumns,
            torchRadius,
        });

        if (
            gamePhase === GAME_PHASE.PLAYING &&
            !pendingGameOver &&
            !pendingReset
        )
            checkExitReached();
    }

    // ── Game Phase ────────────────────────────────────────────

    function handleGamePhase(dt) {
        if (gamePhase === GAME_PHASE.INTRO_REVEAL) {
            transitionAlpha = 0;
            if (introTimer > 1500) gamePhase = GAME_PHASE.INTRO_PAN;
        } else if (gamePhase === GAME_PHASE.INTRO_PAN) {
            transitionAlpha = p.constrain(transitionAlpha + dt / 5000, 0, 1);
            if (transitionAlpha >= 1) {
                fogOpacity = p.constrain(fogOpacity + dt / 5, 0, 255);
                if (fogOpacity >= 255) gamePhase = GAME_PHASE.PLAYING;
            }
        } else {
            transitionAlpha = 1;
            fogOpacity = 255;
        }
    }

    // ── Gameplay Logic ────────────────────────────────────────

    function handleGameplayLogic(dt) {
        if (
            currentGameState !== GAME_STATE.PLAYING ||
            gamePhase !== GAME_PHASE.PLAYING
        )
            return;

        if (pendingGameOver) {
            gameOverDelayTimer -= dt;
            if (player.animState === 'EXTINGUISH') {
                torchRadius = Math.max(
                    0,
                    torchRadius -
                        (torchRadius / Math.max(gameOverDelayTimer + dt, 1)) *
                            dt,
                );
            }
            if (gameOverDelayTimer <= 0) {
                pendingGameOver = false;
                currentGameState = GAME_STATE.GAMEOVER;
                timerRunning = false;
            }
            return;
        }

        if (pendingReset) {
            resetDelayTimer -= dt;
            if (resetDelayTimer <= 0) {
                pendingReset = false;
                findStartTile(player, maze, gridRows, gridColumns);
            }
            return;
        }

        moveTimer += dt;
        trapTimer += dt;
        trapDamageTimer -= dt;

        moveTimer = movePlayer(
            p,
            player,
            moveTimer,
            maze,
            gridRows,
            gridColumns,
        );

        const trapResult = checkStandingOnTrap({
            currentGameState,
            currentLevel,
            player,
            maze,
            trapTimer,
            trapDamageTimer,
            darknessEffectTimer,
            torchRadius,
            torchEffectTimer,
            dt,
            onDamage: (amount) => {
                shakeTimer = SHAKE_MS;
                hitFlashTimer = HIT_FLASH_MS;
                triggerHitAnim(player);
                if (takeDamage(player, amount)) onPlayerDeath();
            },
            onReset: () => {
                triggerFallAnim(player);
                pendingReset = true;
                resetDelayTimer = FALL_ANIM_MS;
            },
            onDarkness: () => {},
        });
        trapDamageTimer = trapResult.trapDamageTimer;
        darknessEffectTimer = trapResult.darknessEffectTimer;
        torchRadius = trapResult.torchRadius;

        const isDark = darknessEffectTimer > 0;
        if (isDark && !wasDark) triggerDimAnim(player);
        if (!isDark && wasDark && player.animState === 'DIM')
            setAnim(player, 'IDLE');
        wasDark = isDark;

        const prevVisionTimer = visionEffectTimer;

        const puResult = checkPowerUps({
            currentGameState,
            player,
            maze,
            dt,
            timeLeft,
            timeBonusTextTimer,
            torchEffectTimer,
            visionEffectTimer,
            darknessEffectTimer,
            torchRadius,
            debugMode,
        });
        timeLeft = puResult.timeLeft;
        timeBonusTextTimer = puResult.timeBonusTextTimer;
        torchEffectTimer = puResult.torchEffectTimer;
        visionEffectTimer = puResult.visionEffectTimer;
        torchRadius = puResult.torchRadius;

        const wasVision = prevVisionTimer > 0;
        const isVision = visionEffectTimer > 0;
        if (isVision && !wasVision) {
            visionPanDir = -1;
        } else if (!isVision && wasVision) {
            visionPanDir = +1;
            enableCamera = true;
        }
        if (visionEffectTimer > 0 && visionTransitionAlpha <= 0)
            enableCamera = false;
        if (visionEffectTimer <= 0 && visionTransitionAlpha >= 1)
            enableCamera = !debugMode;

        updateTimer();
    }

    // ── Timer ─────────────────────────────────────────────────

    function updateTimer() {
        if (!timerRunning || currentGameState !== GAME_STATE.PLAYING) return;
        timeLeft = Math.max(0, timeLeft - p.deltaTime / 1000);
        if (timeLeft <= 0) onTimeUp();
    }

    // ── Win / Loss Events ─────────────────────────────────────

    function onPlayerDeath() {
        lossReason = `You succumbed to the traps.\nFinal Score: ${calculateScore(player.hp, timeLeft)}`;
        timerRunning = false;
        pendingGameOver = true;
        gameOverDelayTimer = 12 * 200;
    }

    function onTimeUp() {
        triggerExtinguishAnim(player);
        lossReason = `Your torch burned out in the darkness.\nFinal Score: ${calculateScore(player.hp, timeLeft)}`;
        timerRunning = false;
        pendingGameOver = true;
        gameOverDelayTimer = 12 * 200 + 400;
    }

    function checkExitReached() {
        if (maze[player.gridY][player.gridX] === TILE_MAP.exit)
            onLevelComplete();
    }

    function onLevelComplete() {
        const score = calculateScore(player.hp, timeLeft);
        saveScore(currentLevel, playerName, score);
        if (score > levelScores[currentLevel])
            levelScores[currentLevel] = score;
        unlockLevel(currentLevel + 1);
        victoryMessage = `Final Score: ${score}`;
        currentGameState = GAME_STATE.VICTORY;
        timerRunning = false;
    }

    // ── Screen Routing ────────────────────────────────────────

    function drawScreen() {
        const fonts = getFonts();
        const assets = getAssets();

        switch (currentGameState) {
            case GAME_STATE.MENU:
                drawMainMenu(p, {
                    playerName,
                    onPlay: () => {
                        currentGameState = playerName
                            ? GAME_STATE.LEVEL_SELECT
                            : GAME_STATE.NAME_INPUT;
                    },
                    onChangePlayer: () => {
                        playerName = '';
                        clearPlayerName();
                        currentGameState = GAME_STATE.NAME_INPUT;
                    },
                    onLeaderboard: () => {
                        currentGameState = GAME_STATE.GLOBAL_LEADERBOARD;
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.NAME_INPUT:
                drawNameInput(p, {
                    playerName,
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.LEVEL_SELECT:
                drawLevelSelect(p, {
                    levels: LEVELS,
                    maxUnlockedLevel: getMaxUnlockedLevel(),
                    onSelect: (i) => {
                        if (!isLevelUnlocked(i)) return;
                        currentLevel = i;
                        loadLevel(i);
                        currentGameState = GAME_STATE.PLAYING;
                    },
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.GAMEOVER:
                drawGameOver(p, {
                    lossReason,
                    onRetry: () => {
                        loadLevel(currentLevel);
                        currentGameState = GAME_STATE.PLAYING;
                        p.loop();
                    },
                    onLevels: () => {
                        currentGameState = GAME_STATE.LEVEL_SELECT;
                    },
                    onMenu: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.VICTORY:
                drawVictory(p, {
                    victoryMessage,
                    currentLevel,
                    levels: LEVELS,
                    playerName,
                    topScores: getLeaderboard(currentLevel),
                    onContinue: () => {
                        currentGameState = GAME_STATE.LEVEL_SELECT;
                    },
                    onRetry: () => {
                        loadLevel(currentLevel);
                        currentGameState = GAME_STATE.PLAYING;
                        p.loop();
                    },
                    onMenu: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.GLOBAL_LEADERBOARD:
                drawLeaderboard(p, {
                    playerName,
                    leaderboardView,
                    data:
                        leaderboardView === 'overall'
                            ? getOverallLeaderboard()
                            : getLeaderboard(leaderboardView),
                    onViewChange: (v) => {
                        leaderboardView = v;
                    },
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
                    fonts,
                    assets,
                });
                break;
        }
    }
});
