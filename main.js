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
} from './common/constants.js';
import { LEVELS } from './common/levels.js';
import { getScaleFactor, calculateScore } from './common/utils.js';
import {
    createPlayer,
    findStartTile,
    movePlayer,
    takeDamage,
    drawPlayer,
} from './entities/player.js';
import { applyCamera, followPlayer } from './entities/camera.js';
import { drawGrid, createFogLayer, renderFog } from './entities/map.js';
import { isTrapActive, checkStandingOnTrap } from './entities/traps.js';
import { checkPowerUps } from './entities/powerups.js';
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

/**
 * Returns the highest level the player has unlocked.
 * Always at least 1 (level 1 is free).
 */
function getMaxUnlockedLevel() {
    return parseInt(localStorage.getItem(UNLOCK_KEY) || '1', 10);
}

/**
 * Persists the highest unlocked level, but never decreases it.
 */
function unlockLevel(level) {
    const current = getMaxUnlockedLevel();
    if (level > current) {
        localStorage.setItem(UNLOCK_KEY, String(level));
    }
}

/**
 * Returns true if `level` is available to play.
 */
function isLevelUnlocked(level) {
    return level <= getMaxUnlockedLevel();
}

// ============================================================
// Per-level asset mapping
// ============================================================

/**
 * Returns the asset paths to use for a given level number.
 *  Levels 1-2 → map-light  + traps-light
 *  Levels 3-4 → map-dark   + traps-light
 *  Level  5   → map-dark-v2 + traps-dark
 */
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

    // Pre-loaded image cache so we never reload the same file twice
    const imgCache = {};

    // ── State ────────────────────────────────────────────────
    let debugMode = false;
    let scaleFactor = 1;
    let currentLevel = 1;

    let maze, gridColumns, gridRows, worldWidth, worldHeight;
    let fogLayer;

    let enableCamera = true;
    let enableFog = true;
    let torchRadius = 3;

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

    // ── p5 Preload ───────────────────────────────────────────
    // Pre-loads every tileset/trap variant plus the shared powerup sheet.
    // They are cached in imgCache so loadLevel() can swap them instantly.

    p.preload = () => {
        const paths = [
            'assets/maps/map-light.png',
            'assets/maps/map-dark.png',
            'assets/maps/map-dark-v2.png',
            'assets/traps/traps-light.png',
            'assets/traps/traps-dark.png',
            'assets/powerups/powerups.png',
        ];

        for (const path of paths) {
            imgCache[path] = p.loadImage(
                path,
                () => console.log(`Loaded: ${path}`),
                () => console.warn(`Not found: ${path}`),
            );
        }
    };

    // ── p5 Core ──────────────────────────────────────────────

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.pixelDensity(1);
        p.noSmooth();
        scaleFactor = getScaleFactor(p);
        powerupSheetImg = imgCache['assets/powerups/powerups.png'] || null;
    };

    p.draw = () => {
        p.background(0);

        const currentTime = p.millis();
        let dt = currentTime - lastTimeStamp;
        lastTimeStamp = currentTime;

        if (currentGameState === GAME_STATE.PAUSED) dt = 0;

        if (
            currentGameState === GAME_STATE.PLAYING ||
            currentGameState === GAME_STATE.PAUSED
        ) {
            p.push();
            drawGameWorld();
            p.pop();

            drawHUD(p, { player, timeLeft, timeBonusTextTimer, debugMode });

            if (currentGameState === GAME_STATE.PAUSED) {
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

    // ── Level Loading ─────────────────────────────────────────

    function loadLevel(difficulty) {
        if (!LEVELS[difficulty]) return;

        // Swap tileset and trap sheet for this level
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
    }

    // ── World Rendering ───────────────────────────────────────

    function drawGameWorld() {
        const safeDt = Math.min(p.deltaTime, 50);
        introTimer += safeDt;

        handleGamePhase(safeDt);

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
            transitionAlpha,
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
        drawPlayer(p, player);
        drawIntroCountdown(p, { gamePhase, introTimer, fogOpacity });

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

        if (gamePhase === GAME_PHASE.PLAYING) checkExitReached();
    }

    // ── Game Phase (Intro Animation) ──────────────────────────

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
                if (takeDamage(player, amount)) onPlayerDeath();
            },
            onReset: () => findStartTile(player, maze, gridRows, gridColumns),
        });
        trapDamageTimer = trapResult.trapDamageTimer;
        darknessEffectTimer = trapResult.darknessEffectTimer;
        torchRadius = trapResult.torchRadius;

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
        enableCamera = puResult.enableCamera;

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
        currentGameState = GAME_STATE.GAMEOVER;
        timerRunning = false;
    }

    function onTimeUp() {
        lossReason = `Your torch burned out in the darkness.\nFinal Score: ${calculateScore(player.hp, timeLeft)}`;
        currentGameState = GAME_STATE.GAMEOVER;
        timerRunning = false;
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

        // Unlock the next level
        unlockLevel(currentLevel + 1);

        victoryMessage = `Final Score: ${score}`;
        currentGameState = GAME_STATE.VICTORY;
        timerRunning = false;
    }

    // ── Screen Routing ────────────────────────────────────────

    function drawScreen() {
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
                });
                break;

            case GAME_STATE.NAME_INPUT:
                drawNameInput(p, {
                    playerName,
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
                });
                break;

            case GAME_STATE.LEVEL_SELECT:
                drawLevelSelect(p, {
                    levels: LEVELS,
                    maxUnlockedLevel: getMaxUnlockedLevel(),
                    onSelect: (i) => {
                        // Guard: silently ignore clicks on locked levels
                        if (!isLevelUnlocked(i)) return;
                        currentLevel = i;
                        loadLevel(i);
                        currentGameState = GAME_STATE.PLAYING;
                    },
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                    },
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
                });
                break;
        }
    }
});
