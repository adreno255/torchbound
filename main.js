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
    drawAccountScreen,
    drawLevelSelect,
    drawVictory,
    drawGameOver,
    drawLeaderboard,
    drawTutorialPrompt,
    drawPlayerIdOverlay,
    isAllowedNameChar,
    drawAbout,
} from './scenes/menu.js';
import {
    TUTORIAL_MAZE,
    STOP_POINTS,
    TUTORIAL_MARKERS,
    STOP_PAUSE_MS,
    createStopManager,
    drawTutorialCard,
    drawTutorialCleared,
    drawTutorialGameOver,
} from './scenes/tutorial.js';
import {
    saveScore,
    getLeaderboard,
    getOverallLeaderboard,
} from './common/leaderboard.js';
import {
    getActiveProfile,
    getActivePlayerId,
    createProfile,
    updateActiveProfile,
    clearActivePlayer,
    getMaxUnlockedLevel,
    unlockLevel,
    isLevelUnlocked,
    updatePersonalBest,
    getPersonalBest,
    hasDoneTutorial,
    markTutorialDone,
    getDisplayName,
    readProfileById,
    setActivePlayerId,
    _loadActiveProfile,
} from './common/playerProfile.js';
import {
    initAudio,
    resumeAudio,
    loadAllAudio,
    playBgm,
    stopBgm,
    playSfx,
    setBgmVolume,
    setSfxVolume,
    setOnAudioLoaded,
} from './common/audio.js';

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

// ─────────────────────────────────────────────────────────────
// BGM selection helpers
// ─────────────────────────────────────────────────────────────

/**
 * Returns the BGM key for a given level number.
 * Tutorial and levels 1-2 → bgm_dungeon_light
 * Levels 3-4             → bgm_dungeon_dark
 * Level 5                → bgm_dungeon_abyss
 */
function bgmKeyForLevel(level) {
    if (level >= 5) return 'bgm_dungeon_abyss';
    if (level >= 3) return 'bgm_dungeon_dark';
    return 'bgm_dungeon_light';
}

// ============================================================

new p5((p) => {
    // ── Assets ───────────────────────────────────────────────
    let tilesetImg = null;
    let trapSheetImg = null;
    let powerupSheetImg = null;
    let playerImg = null;

    const bgTilesets = { light: null, dark: null, darkv2: null };

    let buttonTilesImg = null;
    let lockImg = null;
    let scrollImg = null;
    let hudBarImg = null;
    let hudHeartImg = null;
    let hudClockImg = null;
    let copyIconImg = null;
    let developerImg = null;
    let downloadIconImg = null;

    let fontHeading = null;
    let fontBody = null;

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
    let leaderboardData = [];
    let victoryTopScores = [];

    let player = createPlayer();
    let moveTimer = 0;
    let levelScores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    const aboutScroll = { y: 0, targetY: 0, maxScroll: 0 };

    // ── Account state ─────────────────────────────────────────
    let draftName = '';
    let accountTab = 'create';
    let accountError = '';

    function getActiveDisplayName() {
        const profile = getActiveProfile();
        if (!profile) return null;
        return getDisplayName(profile.username, profile.playerId);
    }

    let trapTimer = 0;
    let trapDamageTimer = 0;
    let darknessEffectTimer = 0;
    let torchEffectTimer = 0;
    let visionEffectTimer = 0;
    let timeBonusTextTimer = 0;

    let pendingVictory = false;
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

    // ── Torch flicker state ───────────────────────────────────
    let flickerOffset = 0;
    const FLICKER_SPEED = 0.0012;

    // ── Tutorial state ────────────────────────────────────────
    let isTutorial = false;
    let tutorialPhase = 'playing';
    let activeStopPoint = null;
    let stopPauseTimer = 0;
    const stopManager = createStopManager();

    // ── Audio state ───────────────────────────────────────────
    // Tracks whether we've already switched to the last-30s BGM this level
    let last30Active = false;

    // ── Cursor tracking ───────────────────────────────────────
    let _anyButtonHovered = false;

    p._registerButtonHover = () => {
        _anyButtonHovered = true;
    };

    // ── Bundle helpers ────────────────────────────────────────

    function getFonts() {
        return { heading: fontHeading, body: fontBody };
    }

    function getAssets() {
        return {
            buttonTiles: buttonTilesImg,
            lockImg,
            scrollImg,
            hudBar: hudBarImg,
            hudHeart: hudHeartImg,
            hudClock: hudClockImg,
            copyIcon: copyIconImg,
            developerImg,
            downloadIcon: downloadIconImg,
        };
    }

    function getBgTilesets() {
        return bgTilesets;
    }

    // ─────────────────────────────────────────────────────────
    // BGM routing
    // Centralise all "what should be playing right now" logic here.
    // Call whenever the game state changes.
    // ─────────────────────────────────────────────────────────

    function updateBgm() {
        switch (currentGameState) {
            case GAME_STATE.PLAYING:
            case GAME_STATE.PAUSED: {
                if (isTutorial) {
                    playBgm('bgm_dungeon_light');
                } else if (last30Active) {
                    playBgm('bgm_last30');
                } else {
                    playBgm(bgmKeyForLevel(currentLevel));
                }
                break;
            }

            // All menu-like screens share the menu BGM
            case GAME_STATE.MENU:
            case GAME_STATE.ACCOUNTS:
            case GAME_STATE.TUTORIAL_PROMPT:
            case GAME_STATE.TUTORIAL_CLEARED:
            case GAME_STATE.TUTORIAL_GAMEOVER:
            case GAME_STATE.LEVEL_SELECT:
            case GAME_STATE.GAMEOVER:
            case GAME_STATE.VICTORY:
            case GAME_STATE.GLOBAL_LEADERBOARD:
            case GAME_STATE.ABOUT:
                playBgm('bgm_menu');
                break;

            default:
                break;
        }
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
            'assets/player/player-v2.png',
        ];

        for (const path of paths) {
            imgCache[path] = p.loadImage(
                path,
                () => console.log(`Loaded: ${path}`),
                () => console.warn(`Not found: ${path}`),
            );
        }

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
        hudBarImg = p.loadImage(
            'assets/ui/hud-bar.png',
            () => console.log('Loaded: hud-bar.png'),
            () => console.warn('Not found: assets/ui/hud-bar.png'),
        );
        hudHeartImg = p.loadImage(
            'assets/ui/hud-heart.png',
            () => console.log('Loaded: hud-heart.png'),
            () => console.warn('Not found: assets/ui/hud-heart.png'),
        );
        hudClockImg = p.loadImage(
            'assets/ui/hud-clock.png',
            () => console.log('Loaded: hud-clock.png'),
            () => console.warn('Not found: assets/ui/hud-clock.png'),
        );
        copyIconImg = p.loadImage(
            'assets/ui/copy-icon.png',
            () => console.log('Loaded: copy-icon.png'),
            () => console.warn('Not found: assets/ui/copy-icon.png'),
        );
        developerImg = p.loadImage(
            'assets/ui/developer_image.JPG',
            () => console.log('Loaded: developer_image.JPG'),
            () => console.warn('Not found: assets/ui/developer_image.JPG'),
        );
        downloadIconImg = p.loadImage(
            'assets/ui/download-icon.png',
            () => console.log('Loaded: download-icon.png'),
            () => console.warn('Not found: assets/ui/download-icon.png'),
        );

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
        playerImg = imgCache['assets/player/player-v2.png'] || null;

        setOnAudioLoaded(() => updateBgm());

        _loadActiveProfile();
    };

    p.draw = () => {
        _anyButtonHovered = false;

        const currentTime = p.millis();
        let dt = currentTime - lastTimeStamp;
        lastTimeStamp = currentTime;

        // Freeze dt when paused, or when a tutorial card is showing
        const tutorialFrozen =
            isTutorial &&
            (tutorialPhase === 'pausing' ||
                tutorialPhase === 'card' ||
                tutorialPhase === 'cleared' ||
                tutorialPhase === 'gameover');

        if (currentGameState === GAME_STATE.PAUSED || tutorialFrozen) dt = 0;

        if (
            currentGameState === GAME_STATE.PLAYING &&
            gamePhase === GAME_PHASE.PLAYING
        ) {
            flickerOffset += Math.min(dt, 50) * FLICKER_SPEED;
        }

        // ── Background ────────────────────────────────────────
        if (currentGameState === GAME_STATE.PLAYING) {
            p.background(0);
        } else {
            const useLevelKey =
                currentGameState === GAME_STATE.PAUSED ||
                currentGameState === GAME_STATE.VICTORY ||
                currentGameState === GAME_STATE.GAMEOVER ||
                currentGameState === GAME_STATE.TUTORIAL ||
                currentGameState === GAME_STATE.TUTORIAL_CLEARED ||
                currentGameState === GAME_STATE.TUTORIAL_GAMEOVER;

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
                dt: Math.min(p.deltaTime, 50),
                gamePhase,
                introTimer,
                fonts: getFonts(),
                assets: getAssets(),
            });

            if (currentGameState === GAME_STATE.PAUSED) {
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
                        updateBgm();
                    },
                    onRetry: () => {
                        if (isTutorial) {
                            loadTutorial();
                        } else {
                            loadLevel(currentLevel);
                        }
                        currentGameState = GAME_STATE.PLAYING;
                        updateBgm();
                        p.loop();
                    },
                    onLevels: () => {
                        isTutorial = false;
                        currentGameState = GAME_STATE.LEVEL_SELECT;
                        updateBgm();
                    },
                    onMenu: () => {
                        isTutorial = false;
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
                    },
                    fonts: getFonts(),
                    assets: getAssets(),
                });
                p.pop();
            } else {
                // Tutorial card overlay — drawn on top of the game world
                if (isTutorial && tutorialPhase === 'card' && activeStopPoint) {
                    drawTutorialCard(
                        p,
                        activeStopPoint,
                        onTutorialCardContinue,
                        getFonts(),
                        getAssets(),
                    );
                } else {
                    handleGameplayLogic(dt);
                }
            }
        } else {
            p.push();
            drawScreen();
            p.pop();
        }

        // ── Player ID overlay — every non-playing screen ──────
        if (currentGameState !== GAME_STATE.PLAYING) {
            const profile = getActiveProfile();
            if (profile) {
                drawPlayerIdOverlay(p, {
                    playerId: profile.playerId,
                    fonts: getFonts(),
                    assets: getAssets(),
                    onCopy: () => {
                        navigator.clipboard
                            .writeText(profile.playerId)
                            .catch(() => {});
                    },
                });
            }
        }

        p.canvas.style.cursor = _anyButtonHovered ? 'pointer' : 'default';
    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        scaleFactor = getScaleFactor(p);
    };

    // ── Keyboard ─────────────────────────────────────────────

    p.keyPressed = () => {
        initAudio();
        // Resume audio context on first user gesture (browser requirement)
        resumeAudio();

        if (currentGameState === GAME_STATE.ACCOUNTS) {
            if (p.keyCode === p.ENTER) {
                if (accountTab === 'create') {
                    if (draftName.trim().length > 0) {
                        const name = draftName.trim();
                        draftName = '';
                        accountError = 'Creating account…';
                        (async () => {
                            await createProfile(name);
                            accountError = '';
                            currentGameState = GAME_STATE.TUTORIAL_PROMPT;
                            updateBgm();
                        })();
                    }
                } else {
                    const trimmed = draftName.trim();
                    if (trimmed.length > 0) {
                        accountError = 'Looking up account…';
                        (async () => {
                            const found = await readProfileById(trimmed);
                            if (found) {
                                setActivePlayerId(found.playerId);
                                await _loadActiveProfile();
                                draftName = '';
                                accountError = '';
                                currentGameState = GAME_STATE.MENU;
                                updateBgm();
                            } else {
                                accountError =
                                    'No account found with that Player ID.';
                            }
                        })();
                    }
                }
            } else if (p.keyCode === p.BACKSPACE) {
                draftName = draftName.slice(0, -1);
                accountError = '';
                playSfx('sfx_keypress');
            } else if (p.key.length === 1) {
                // 17 is Control, 91 and 93 are Meta/Command (Mac), 18 is Alt/Option
                const isModifierDown =
                    p.keyIsDown(17) ||
                    p.keyIsDown(91) ||
                    p.keyIsDown(93) ||
                    p.keyIsDown(18);

                if (!isModifierDown) {
                    const maxLen = accountTab === 'create' ? 12 : 24;
                    const allowed = isAllowedNameChar(p.key);
                    if (allowed && draftName.length < maxLen) {
                        draftName += p.key;
                        accountError = '';
                        playSfx('sfx_keypress');
                    }
                }
            }
            return;
        }

        if (p.key === 'p' || p.key === 'P' || p.keyCode === 27) {
            // Don't allow pause while a tutorial card is showing
            if (isTutorial && tutorialPhase === 'card') return;

            if (currentGameState === GAME_STATE.PLAYING) {
                currentGameState = GAME_STATE.PAUSED;
                timerRunning = false;
                // BGM keeps playing through pause — no track change needed
            } else if (currentGameState === GAME_STATE.PAUSED) {
                currentGameState = GAME_STATE.PLAYING;
                timerRunning = true;
                lastTimeStamp = p.millis();
            }
        }

        // if (p.key === '0') debugMode = !debugMode;

        // if (debugMode) {
        //     if (p.key === '1') loadLevel(1);
        //     if (p.key === '2') loadLevel(2);
        //     if (p.key === '3') loadLevel(3);
        //     if (p.key === 'm' || p.key === 'M') enableCamera = !enableCamera;
        //     if (p.key === 'f' || p.key === 'F') enableFog = !enableFog;
        // }
    };

    // ── Clipboard paste support ───────────────────────────────
    window.addEventListener('paste', (e) => {
        if (currentGameState !== GAME_STATE.ACCOUNTS) return;

        const pastedText = (e.clipboardData || window.clipboardData).getData(
            'text',
        );
        if (!pastedText) return;

        let filteredText = '';
        for (let char of pastedText) {
            if (isAllowedNameChar(char)) {
                filteredText += char;
            }
        }

        const maxLen = accountTab === 'create' ? 12 : 24;
        const oldLen = draftName.length;
        draftName = (draftName + filteredText).slice(0, maxLen);

        if (filteredText.length < pastedText.length) {
            accountError = 'Invalid characters removed from paste.';
        } else if (oldLen + filteredText.length > maxLen) {
            accountError = 'Paste truncated to character limit.';
        } else {
            accountError = '';
        }

        // Play a single keypress sound for the paste action
        playSfx('sfx_keypress');
        e.preventDefault();
    });

    // ── Mouse events support ───────────────────────────────
    p.mouseWheel = (event) => {
        if (currentGameState === GAME_STATE.ABOUT) {
            aboutScroll.targetY = Math.max(
                0,
                Math.min(
                    aboutScroll.maxScroll,
                    aboutScroll.targetY + event.delta,
                ),
            );
            return false;
        }
    };

    p.mousePressed = () => {
        initAudio();
        // One-time check to resume audio on the first click
        resumeAudio();
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

        isTutorial = false;
        last30Active = false;

        const assets = assetsForLevel(difficulty);
        tilesetImg = imgCache[assets.tileset] || null;
        trapSheetImg = imgCache[assets.traps] || null;

        const levelData = LEVELS[difficulty];
        maze = levelData.maze.map((row) => row.slice());
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

    /**
     * Loads the static tutorial level.
     */
    function loadTutorial() {
        isTutorial = true;
        tutorialPhase = 'playing';
        activeStopPoint = null;
        stopPauseTimer = 0;
        stopManager.reset();
        last30Active = false;

        tilesetImg = imgCache['assets/maps/map-light.png'] || null;
        trapSheetImg = imgCache['assets/traps/traps-light.png'] || null;

        maze = TUTORIAL_MAZE.map((row) => row.slice());
        gridRows = maze.length;
        gridColumns = maze[0].length;
        worldWidth = gridColumns * TILE_SIZE;
        worldHeight = gridRows * TILE_SIZE;

        fogLayer = createFogLayer(p, worldWidth, worldHeight);

        player = createPlayer();
        findStartTile(player, maze, gridRows, gridColumns);

        resetTimers(300);

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
        pendingVictory = false;
        pendingGameOver = false;
        gameOverDelayTimer = 0;
        wasDark = false;
        hitFlashTimer = 0;
        shakeTimer = 0;
        visionTransitionAlpha = 1;
        visionPanDir = 0;
        flickerOffset = Math.random() * 1000;
    }

    // ── Tutorial stop-point helpers ───────────────────────────

    function onTutorialCardContinue() {
        tutorialPhase = 'playing';
        activeStopPoint = null;
        timerRunning = true;
        lastTimeStamp = p.millis();
    }

    function triggerStopPoint(sp) {
        stopManager.trigger(sp.id);
        activeStopPoint = sp;
        tutorialPhase = 'pausing';
        stopPauseTimer = STOP_PAUSE_MS;
        timerRunning = false;
    }

    function tickTutorialPause(dt) {
        stopPauseTimer -= dt;
        if (stopPauseTimer <= 0) {
            tutorialPhase = 'card';
        }
    }

    // ── World Rendering ───────────────────────────────────────

    function drawGameWorld() {
        const safeDt = Math.min(p.deltaTime, 50);
        introTimer += safeDt;

        handleGamePhase(safeDt);

        if (shakeTimer > 0) {
            shakeTimer -= safeDt;
            const env = Math.max(0, shakeTimer / SHAKE_MS);
            const mag = SHAKE_MAG * env;
            p.translate(p.random(-mag, mag), p.random(-mag, mag));
        }

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
            flickerSeed: p.noise(flickerOffset),
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
                if (fogOpacity >= 255) {
                    gamePhase = GAME_PHASE.PLAYING;
                    // BGM starts when gameplay actually begins
                    updateBgm();
                }
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

        // ── Tutorial pause-beat countdown ─────────────────────
        if (isTutorial && tutorialPhase === 'pausing') {
            tickTutorialPause(Math.min(p.deltaTime, 50));
            return;
        }

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
                if (isTutorial) {
                    tutorialPhase = 'gameover';
                    currentGameState = GAME_STATE.TUTORIAL_GAMEOVER;
                } else {
                    currentGameState = GAME_STATE.GAMEOVER;
                }
                timerRunning = false;
                updateBgm();
            }
            return;
        }

        if (pendingReset) {
            resetDelayTimer -= dt;
            if (resetDelayTimer <= 0) {
                pendingReset = false;
                findStartTile(
                    player,
                    maze,
                    gridRows,
                    gridColumns,
                    darknessEffectTimer > 0,
                );
            }
            return;
        }

        moveTimer += dt;
        trapTimer += dt;
        trapDamageTimer -= dt;

        const powerupActive = torchEffectTimer > 0 || visionEffectTimer > 0;
        const isDark = darknessEffectTimer > 0 && !powerupActive;
        const prevDarknessTimer = darknessEffectTimer;

        moveTimer = movePlayer(
            p,
            player,
            moveTimer,
            maze,
            gridRows,
            gridColumns,
            isDark,
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
                playSfx('sfx_hit');
                triggerHitAnim(player);
                if (takeDamage(player, amount)) onPlayerDeath();
            },
            onReset: () => {
                playSfx('sfx_fall');
                triggerFallAnim(player);
                pendingReset = true;
                resetDelayTimer = FALL_ANIM_MS;
            },
            onDarkness: () => {
                if (
                    player.animState !== 'DIM_IDLE' &&
                    player.animState !== 'DIM_WALK' &&
                    player.animState !== 'DEAD' &&
                    player.animState !== 'EXTINGUISH'
                ) {
                    triggerDimAnim(player);
                }
            },
        });
        trapDamageTimer = trapResult.trapDamageTimer;
        darknessEffectTimer = trapResult.darknessEffectTimer;
        torchRadius = trapResult.torchRadius;

        if (prevDarknessTimer <= 0 && darknessEffectTimer > 0) {
            playSfx('sfx_darkness');
        }

        if (!isDark && wasDark) {
            if (player.animState === 'DIM_IDLE') setAnim(player, 'IDLE');
            if (player.animState === 'DIM_WALK') setAnim(player, 'WALK');
        }
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

        // ── Powerup SFX — fire on the frame the timer goes from 0 → positive
        const justGotTorch =
            puResult.torchEffectTimer > 0 && torchEffectTimer === 0;
        const justGotVision =
            puResult.visionEffectTimer > 0 && visionEffectTimer === 0;
        const justGotTime =
            puResult.timeBonusTextTimer > 0 && timeBonusTextTimer === 0;

        if (justGotTorch) playSfx('sfx_powerup_torch');
        if (justGotVision) playSfx('sfx_powerup_vision');
        if (justGotTime) playSfx('sfx_powerup_time');

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

        // ── Tutorial stop-point detection ─────────────────────
        if (isTutorial && tutorialPhase === 'playing') {
            const sp = stopManager.check(player);
            if (sp) triggerStopPoint(sp);
        }

        updateTimer();
    }

    // ── Timer ─────────────────────────────────────────────────

    function updateTimer() {
        if (!timerRunning || currentGameState !== GAME_STATE.PLAYING) return;
        timeLeft = Math.max(0, timeLeft - p.deltaTime / 1000);

        // ── Last-30-second BGM switch ─────────────────────────
        if (!last30Active && timeLeft <= 30 && timeLeft > 0) {
            last30Active = true;
            playBgm('bgm_last30');
        }

        if (timeLeft <= 0) onTimeUp();
    }

    // ── Win / Loss Events ─────────────────────────────────────

    function onPlayerDeath() {
        if (isTutorial) {
            lossReason = 'Your torch went dark in the dungeon.';
        } else {
            lossReason = `You succumbed to the traps.\nFinal Score: ${calculateScore(player.hp, timeLeft)}`;
        }
        timerRunning = false;
        pendingGameOver = true;
        gameOverDelayTimer = 12 * 200;
        playSfx('sfx_gameover');
    }

    function onTimeUp() {
        triggerExtinguishAnim(player);
        if (isTutorial) {
            lossReason =
                'Your torch burned out before you finished the tutorial.';
        } else {
            lossReason = `Your torch burned out in the darkness.\nFinal Score: ${calculateScore(player.hp, timeLeft)}`;
        }
        timerRunning = false;
        pendingGameOver = true;
        gameOverDelayTimer = 12 * 200 + 400;
        playSfx('sfx_gameover');
    }

    function checkExitReached() {
        if (maze[player.gridY][player.gridX] === TILE_MAP.exit) {
            if (isTutorial) {
                onTutorialComplete();
            } else if (!pendingVictory) {
                pendingVictory = true;
                onLevelComplete();
            }
        }
    }

    async function onLevelComplete() {
        const score = calculateScore(player.hp, timeLeft);
        const displayName = getActiveDisplayName() ?? 'Anonymous';

        // Wait for the write to finish before fetching — guarantees new score is included
        await saveScore(currentLevel, displayName, score, getActivePlayerId());
        await updatePersonalBest(currentLevel, score);

        if (score > levelScores[currentLevel])
            levelScores[currentLevel] = score;
        unlockLevel(currentLevel + 1);
        victoryMessage = `Final Score: ${score}`;
        currentGameState = GAME_STATE.VICTORY;
        timerRunning = false;
        playSfx('sfx_victory');
        updateBgm();

        // Now safe to fetch — the new score is already in the DB
        victoryTopScores = await getLeaderboard(currentLevel);
    }

    function onTutorialComplete() {
        markTutorialDone();
        timerRunning = false;
        isTutorial = false;
        currentGameState = GAME_STATE.TUTORIAL_CLEARED;
        playSfx('sfx_victory');
        updateBgm();
    }

    // ── Screen Routing ────────────────────────────────────────

    function openAccounts(tab = 'create') {
        draftName = '';
        accountTab = tab;
        accountError = '';
        currentGameState = GAME_STATE.ACCOUNTS;
        updateBgm();
    }

    // ── Score Fetching Helper ────────────────────────────────────────
    async function fetchLeaderboardData() {
        if (leaderboardView === 'overall') {
            leaderboardData = await getOverallLeaderboard();
        } else {
            leaderboardData = await getLeaderboard(leaderboardView);
        }
    }

    function drawScreen() {
        const fonts = getFonts();
        const assets = getAssets();

        switch (currentGameState) {
            case GAME_STATE.TUTORIAL_PROMPT:
                drawTutorialPrompt(p, {
                    onYes: () => {
                        markTutorialDone();
                        loadTutorial();
                        currentGameState = GAME_STATE.PLAYING;
                        updateBgm();
                        p.loop();
                    },
                    onNo: () => {
                        markTutorialDone();
                        currentGameState = GAME_STATE.LEVEL_SELECT;
                        updateBgm();
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.TUTORIAL:
                // Legacy path — immediately redirect to real tutorial
                loadTutorial();
                currentGameState = GAME_STATE.PLAYING;
                updateBgm();
                p.loop();
                break;

            case GAME_STATE.TUTORIAL_CLEARED:
                drawTutorialCleared(p, {
                    onLevels: () => {
                        currentGameState = GAME_STATE.LEVEL_SELECT;
                        updateBgm();
                    },
                    onMenu: () => {
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.TUTORIAL_GAMEOVER:
                drawTutorialGameOver(p, {
                    lossReason,
                    onRetry: () => {
                        loadTutorial();
                        currentGameState = GAME_STATE.PLAYING;
                        updateBgm();
                        p.loop();
                    },
                    onMenu: () => {
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.MENU:
                drawMainMenu(p, {
                    displayName: getActiveDisplayName(),
                    onPlay: () => {
                        if (!getActiveProfile()) {
                            openAccounts('create');
                        } else {
                            currentGameState = GAME_STATE.LEVEL_SELECT;
                            updateBgm();
                        }
                    },
                    onTutorial: () => {
                        loadTutorial();
                        currentGameState = GAME_STATE.PLAYING;
                        updateBgm();
                        p.loop();
                    },
                    onAccounts: () => openAccounts('create'),
                    onLeaderboard: () => {
                        leaderboardView = 'overall';
                        fetchLeaderboardData();
                        currentGameState = GAME_STATE.GLOBAL_LEADERBOARD;
                        updateBgm();
                    },
                    onAbout: () => {
                        aboutScroll.y = 0;
                        aboutScroll.targetY = 0;
                        currentGameState = GAME_STATE.ABOUT;
                        updateBgm();
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.ACCOUNTS:
                drawAccountScreen(p, {
                    draftName,
                    accountTab,
                    accountError,
                    activeProfile: getActiveProfile(),
                    onSwitchTab: (tab) => {
                        accountTab = tab;
                        draftName = '';
                        accountError = '';
                    },
                    onBack: () => {
                        draftName = '';
                        accountError = '';
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
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
                        updateBgm();
                    },
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
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
                        updateBgm();
                        p.loop();
                    },
                    onLevels: () => {
                        currentGameState = GAME_STATE.LEVEL_SELECT;
                        updateBgm();
                    },
                    onMenu: () => {
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
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
                    playerDisplayName: getActiveDisplayName() ?? 'Anonymous',
                    playerCurrentHighScore: getPersonalBest(currentLevel),
                    topScores: victoryTopScores,
                    onContinue: () => {
                        const lastLevel = Math.max(
                            ...Object.keys(LEVELS).map(Number),
                        );
                        if (currentLevel === lastLevel) {
                            leaderboardView = 'overall';
                            fetchLeaderboardData();
                            currentGameState = GAME_STATE.GLOBAL_LEADERBOARD;
                        } else {
                            currentGameState = GAME_STATE.LEVEL_SELECT;
                        }
                        updateBgm();
                    },
                    onRetry: () => {
                        loadLevel(currentLevel);
                        currentGameState = GAME_STATE.PLAYING;
                        updateBgm();
                        p.loop();
                    },
                    onMenu: () => {
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.GLOBAL_LEADERBOARD:
                drawLeaderboard(p, {
                    displayName: getActiveDisplayName() ?? '',
                    leaderboardView,
                    data: leaderboardData,
                    onViewChange: (v) => {
                        leaderboardView = v;
                        fetchLeaderboardData();
                    },
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
                    },
                    fonts,
                    assets,
                });
                break;

            case GAME_STATE.ABOUT:
                drawAbout(p, {
                    onBack: () => {
                        currentGameState = GAME_STATE.MENU;
                        updateBgm();
                    },
                    scrollState: aboutScroll,
                    fonts,
                    assets,
                });
                break;
        }
    }
});
