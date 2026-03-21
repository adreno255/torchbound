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
 *  Level 3 → map-dark   + traps-light
 * Level 3 → map-dark   + traps-dark
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
    let playerImg = null;

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

    // Deferred-action timers
    // pendingReset: hold the fall anim in place before teleporting to start
    let pendingReset = false;
    let resetDelayTimer = 0;
    const FALL_ANIM_MS = 5 * 160; // 800 ms — fall anim total duration

    // pendingGameOver: hold the dead/extinguish anim before showing game over
    let pendingGameOver = false;
    let gameOverDelayTimer = 0;

    // wasDark: edge-detect darkness-effect so triggerDimAnim fires once per
    // darkness event rather than every tick while darknessEffectTimer > 0
    let wasDark = false;

    // ── Screen-space effects ──────────────────────────────────
    // Spike damage: red vignette flash + screen shake
    let hitFlashTimer = 0; // ms remaining for red vignette
    const HIT_FLASH_MS = 350; // total vignette duration
    let shakeTimer = 0; // ms remaining for shake
    const SHAKE_MS = 280; // total shake duration
    const SHAKE_MAG = 5; // max pixel offset at peak

    // Vision powerup: smooth zoom-out / zoom-back transition
    // visionTransitionAlpha mirrors transitionAlpha:
    //   1 = fully zoomed in (normal play)
    //   0 = fully zoomed out (full map visible)
    let visionTransitionAlpha = 1;
    let visionPanDir = 0; // -1 = zooming out, +1 = zooming back, 0 = idle
    const VISION_PAN_MS = 600; // ms to complete the full pan

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
            'assets/player/player.png',
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
        playerImg = imgCache['assets/player/player.png'] || null;
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

            // ── Red vignette (screen-space, after world) ──────
            if (hitFlashTimer > 0) {
                hitFlashTimer -= Math.min(p.deltaTime, 50);
                // Alpha: peaks at start, fades out
                const t = Math.max(0, hitFlashTimer / HIT_FLASH_MS);
                // Ease-out: strong initial flash that softens quickly
                const a = Math.pow(t, 0.5) * 200;
                p.push();
                p.noStroke();
                // Radial vignette — four gradient rects from each edge
                const edgeW = p.windowWidth * 0.1;
                const edgeH = p.windowHeight * 0.1;
                // left
                drawVignetteEdge(p, 0, 0, edgeW, p.windowHeight, a, 'left');
                // right
                drawVignetteEdge(
                    p,
                    p.windowWidth - edgeW,
                    0,
                    edgeW,
                    p.windowHeight,
                    a,
                    'right',
                );
                // top
                drawVignetteEdge(p, 0, 0, p.windowWidth, edgeH, a, 'top');
                // bottom
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

    // ── Screen-effect helpers ─────────────────────────────────

    /**
     * Draws a red gradient rect along one screen edge for the vignette.
     * Uses multiple semi-transparent strips to fake a gradient.
     */
    function drawVignetteEdge(p, x, y, w, h, maxAlpha, side) {
        const STEPS = 10;
        for (let i = 0; i < STEPS; i++) {
            // t=1 at screen edge, t=0 at inner boundary
            const t = 1 - i / STEPS;
            const a = maxAlpha * t * t; // quadratic falloff toward centre
            p.fill(180, 0, 0, a);
            if (side === 'left') {
                p.rect(x + (w / STEPS) * i, y, w / STEPS, h);
            } else if (side === 'right') {
                p.rect(x + w - (w / STEPS) * (i + 1), y, w / STEPS, h);
            } else if (side === 'top') {
                p.rect(x, y + (h / STEPS) * i, w, h / STEPS);
            } else {
                p.rect(x, y + h - (h / STEPS) * (i + 1), w, h / STEPS);
            }
        }
    }

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

        // ── Screen shake ─────────────────────────────────────
        // Decay timer and compute a random offset — only during active shake.
        let shakeX = 0,
            shakeY = 0;
        if (shakeTimer > 0) {
            shakeTimer -= safeDt;
            // Envelope: full magnitude at start, decays linearly to 0
            const env = Math.max(0, shakeTimer / SHAKE_MS);
            const mag = SHAKE_MAG * env;
            shakeX = p.random(-mag, mag);
            shakeY = p.random(-mag, mag);
            p.translate(shakeX, shakeY);
        }

        // ── Vision powerup pan ────────────────────────────────
        // Advance the transition alpha toward its target each frame.
        if (visionPanDir !== 0) {
            const step = safeDt / VISION_PAN_MS;
            visionTransitionAlpha = p.constrain(
                visionTransitionAlpha + visionPanDir * step,
                0,
                1,
            );
            // Arrived at target — stop
            if (visionTransitionAlpha <= 0 || visionTransitionAlpha >= 1) {
                visionPanDir = 0;
            }
        }

        // Use visionTransitionAlpha as the effective transition alpha whenever
        // a vision pan is in progress (panning out OR panning back).
        // Otherwise use the normal intro transitionAlpha.
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

        if (
            gamePhase === GAME_PHASE.PLAYING &&
            !pendingGameOver &&
            !pendingReset
        )
            checkExitReached();
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

        // ── Fix 3 & 4: pending game-over countdown ────────────
        // While this is running the world keeps rendering so the
        // dead/extinguish anim plays out in full before we switch screens.
        if (pendingGameOver) {
            gameOverDelayTimer -= dt;

            // Fix 4: during extinguish, drain torch radius to 0 over the
            // same window so the fog closes in as the flame dies.
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
            // Skip all other logic while waiting — no movement, no new traps
            return;
        }

        // ── Fix 1: pending reset countdown ───────────────────
        // Fall anim plays at the trap tile; teleport fires when timer expires.
        if (pendingReset) {
            resetDelayTimer -= dt;
            if (resetDelayTimer <= 0) {
                pendingReset = false;
                findStartTile(player, maze, gridRows, gridColumns);
            }
            // Still tick animation/fog but block all other input/logic
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
                // Trigger screen shake and red vignette on spike hit
                shakeTimer = SHAKE_MS;
                hitFlashTimer = HIT_FLASH_MS;
                triggerHitAnim(player);
                if (takeDamage(player, amount)) onPlayerDeath();
            },
            // Fix 1: start delay instead of teleporting immediately
            onReset: () => {
                triggerFallAnim(player);
                pendingReset = true;
                resetDelayTimer = FALL_ANIM_MS;
            },
            onDarkness: () => {
                // handled below via edge-detection — do nothing here
            },
        });
        trapDamageTimer = trapResult.trapDamageTimer;
        darknessEffectTimer = trapResult.darknessEffectTimer;
        torchRadius = trapResult.torchRadius;

        // Fix 2: drive dim anim from darknessEffectTimer, not from onDarkness.
        // Trigger only on the leading edge (wasDark false → true transition).
        const isDark = darknessEffectTimer > 0;
        if (isDark && !wasDark) {
            triggerDimAnim(player);
        }
        // While dark and dim anim has finished its 3 frames, hold on last frame
        // (animDone stays true — player.js already holds on the last frame).
        // When darkness expires, return to idle.
        if (!isDark && wasDark && player.animState === 'DIM') {
            setAnim(player, 'IDLE');
        }
        wasDark = isDark;

        // Snapshot vision timer before checkPowerUps so we can detect edges
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
        // NOTE: we do NOT apply puResult.enableCamera directly here —
        // we manage enableCamera ourselves so the vision pan can animate
        // before the camera actually switches modes.

        // Vision pan: detect leading and trailing edge to start smooth pan
        const wasVision = prevVisionTimer > 0;
        const isVision = visionEffectTimer > 0;
        if (isVision && !wasVision) {
            // Powerup just collected — start panning OUT (1 → 0)
            visionPanDir = -1;
            // Keep enableCamera=true so applyCamera uses the lerp path
        } else if (!isVision && wasVision) {
            // Powerup just expired — start panning BACK (0 → 1)
            visionPanDir = +1;
            enableCamera = true; // re-enable follow immediately so
            // camera lerps back from bird's-eye
        }
        // While vision is fully active (pan complete, alpha at 0) disable camera
        if (visionEffectTimer > 0 && visionTransitionAlpha <= 0) {
            enableCamera = false;
        }
        // Restore camera once pan-back is complete
        if (visionEffectTimer <= 0 && visionTransitionAlpha >= 1) {
            enableCamera = !debugMode;
        }

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
        // Fix 3: defer game-over screen until dead anim finishes (800 ms)
        pendingGameOver = true;
        gameOverDelayTimer = 12 * 200; // DEAD: 4 frames × 200 ms
    }

    function onTimeUp() {
        triggerExtinguishAnim(player);
        lossReason = `Your torch burned out in the darkness.\nFinal Score: ${calculateScore(player.hp, timeLeft)}`;
        timerRunning = false;
        // Fix 3 & 4: defer game-over screen until extinguish anim + torch
        // fade finishes (800 ms for the anim, then a brief extra beat)
        pendingGameOver = true;
        gameOverDelayTimer = 12 * 200 + 400; // 1200 ms total
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
