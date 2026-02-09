//#region Globals
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const TILE_SIZE = 32;
const MOVE_DELAY_MS = 400;
const TRAP_DAMAGE_INTERVAL_MS = 500;
const ZOOM = 1.5;
const CAMERA_LERP = 0.05;
const DARKNESS_DURATION = 5000;

function generateMaze(cols, rows, trapChance = 0.05, powerUpChance = 0.02) {
    // 1. Force dimensions to be odd for the best results
    // If user passes 50, it becomes 49 or 51
    const W = cols % 2 === 0 ? cols - 1 : cols;
    const H = rows % 2 === 0 ? rows - 1 : rows;

    let newMaze = Array.from({ length: H }, () => Array(W).fill(1));

    const isInside = (x, y) => x > 0 && x < W - 1 && y > 0 && y < H - 1;

    function carve(x, y) {
        newMaze[y][x] = 0;
        let dirs = [
            [0, -2],
            [0, 2],
            [-2, 0],
            [2, 0],
        ].sort(() => Math.random() - 0.5);

        for (let [dx, dy] of dirs) {
            let nx = x + dx,
                ny = y + dy;
            if (isInside(nx, ny) && newMaze[ny][nx] === 1) {
                newMaze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }

    // Start carving
    carve(1, 1);

    // Place Start (2)
    newMaze[1][0] = 2;

    // Safety Exit Placement: Search from the bottom right for the first available floor
    let placedExit = false;
    for (let y = H - 2; y > 0 && !placedExit; y--) {
        for (let x = W - 2; x > 0 && !placedExit; x--) {
            if (newMaze[y][x] === 0) {
                // Move the exit to the far right wall (W-1) at this row
                newMaze[y][W - 1] = 3;
                placedExit = true;
            }
        }
    }

    // Sprinkle Traps
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            // Only place traps on floors, and NOT on start/exit
            if (newMaze[y][x] === 0 && Math.random() < trapChance) {
                newMaze[y][x] = Math.floor(Math.random() * 3) + 4;
            }
        }
    }

    // Sprinkle Power-ups
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            if (newMaze[y][x] === 0 && Math.random() < powerUpChance) {
                // 2% chance for Power-Ups
                newMaze[y][x] = Math.floor(Math.random() * 3) + 7;
            }
        }
    }

    return newMaze;
}
// prettier-ignore
const LEVELS = {
    1: { 
        name: "The Descent",
        maze: generateMaze(25, 15, 0.03, 0.02),
        time: 120 
    },
    2: { 
        name: "Trial of Shadows",
        maze: generateMaze(30, 25, 0.05, 0.05),
        time: 180 
    },
    3: { 
        name: "The Grand Labyrinth",
        maze: generateMaze(40, 25, 0.08, 0.03),
        time: 300 
    }
};
const TILE_MAP = {
    floor: 0,
    wall: 1,
    start: 2,
    exit: 3,
    fireTrap: 4,
    resetTrap: 5,
    darknessTrap: 6,
    timePowerUp: 7,
    torchPowerUp: 8,
    visionPowerUp: 9,
};
const TRAPS = {
    4: {
        name: 'fire',
        damage: 25,
        activeTime: 2000,
        inactiveTime: 1500,
        type: 'damage',
        randomized: true,
    },
    5: {
        name: 'teleport',
        activeTime: 1000,
        inactiveTime: 2000,
        type: 'reset',
        randomized: true,
    },
    6: {
        name: 'void',
        activeTime: 1500,
        inactiveTime: 1500,
        type: 'darkness',
        randomized: true,
    },
};
const POWER_UP_DURATIONS = {
    TORCH: 5000, // 5 seconds of extra light
    VISION: 3000, // 3 seconds of full map reveal
};
const GAME_PHASE = {
    INTRO_REVEAL: 'intro_reveal',
    INTRO_PAN: 'intro_pan',
    PLAYING: 'playing',
};
const GAME_STATE = {
    MENU: 'menu',
    LEVEL_SELECT: 'level_select',
    PLAYING: 'playing',
    GAMEOVER: 'gameover',
    VICTORY: 'victory',
};

//#endregion

new p5((p) => {
    //#region Variables
    // World
    let debugMode = false;
    let scaleFactor = 1;
    let currentLevel = 1;
    let maze, gridColumns, gridRows, worldWidth, worldHeight, fogLayer;
    let enableCamera = true;
    let enableFog = true;
    let torchRadius = 3;
    let timeLeft = 0;
    let lastTimeStamp = 0;
    let timerRunning = true;
    let cameraX = 0;
    let cameraY = 0;
    let gamePhase = GAME_PHASE.INTRO_REVEAL;
    let transitionAlpha = 0; // 0 = Bird's-eye, 1 = Focused Camera
    let fogOpacity = 0; // 0 = Transparent, 255 = Fully dark
    let introTimer = 0;
    let currentGameState = GAME_STATE.MENU;
    let lossReason = '';

    // Player
    let player = {
        gridX: null,
        gridY: null,
        hp: 100,
        maxHp: 100,
    };
    let moveTimer = 0;

    // Traps
    let trapTimer = 0;
    let trapDamageTimer = 0;
    let darknessEffectTimer = 0;

    // Power-ups
    let torchEffectTimer = 0;
    let visionEffectTimer = 0;
    let timeBonusTextTimer = 0;
    //#endregion

    //#region Debug Mode
    p.keyPressed = () => {
        if (p.key === '0') {
            debugMode = !debugMode;
        }

        if (debugMode) {
            // Switch between levels
            if (p.key === '1') loadLevel(1);

            if (p.key === '2') loadLevel(2);

            if (p.key === '3') loadLevel(3);

            // Press 'M' to toggle between Camera and Whole World view
            if (p.key === 'm' || p.key === 'M') {
                enableCamera = !enableCamera;
                console.log(
                    'Camera View:',
                    enableCamera ? 'ON' : 'OFF (Map Mode)',
                );
            }

            // Press 'F' to toggle between Fog and No Fog View
            if (p.key === 'f' || p.key === 'F') {
                enableFog = !enableFog;
                console.log('Fog View:', enableFog ? 'ON' : 'OFF');
            }
        }
    };
    //#endregion

    //#region p5 Core Functions
    p.setup = () => {
        loadLevel(currentLevel);
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.pixelDensity(1);
        p.noSmooth();
        resizeGame();
        initFog();
        findStartTile();
        lastTimeStamp = p.millis();
    };

    p.draw = () => {
        p.background(0);

        if (currentGameState === GAME_STATE.PLAYING) {
            p.push();
            drawGame();
            p.pop();
            drawHUD();
        } else {
            p.push();

            switch (currentGameState) {
                case GAME_STATE.MENU:
                    drawMenu();
                    break;
                case GAME_STATE.LEVEL_SELECT:
                    drawLevelSelect();
                    break;
                case GAME_STATE.GAMEOVER:
                    drawGameOver();
                    break;
                case GAME_STATE.VICTORY:
                    drawVictory();
                    break;
            }

            p.pop();
        }
    };

    function loadLevel(difficulty) {
        if (!LEVELS[difficulty]) return; // Security check

        // 1. Update the grid dimensions
        const levelData = LEVELS[difficulty];
        gridRows = levelData.maze.length;
        gridColumns = levelData.maze[0].length;
        maze = levelData.maze;

        // 2. Recalculate world size
        worldWidth = gridColumns * TILE_SIZE;
        worldHeight = gridRows * TILE_SIZE;

        // 3. Reset Fog Buffer
        initFog();

        // 4. Reset and relocate player to the start (4) of the new maze
        player.hp = 100;
        findStartTile();

        // 5. Reset timer
        timeLeft = levelData.time;

        // 6. Reset intro
        gamePhase = GAME_PHASE.INTRO_REVEAL;
        transitionAlpha = 0;
        fogOpacity = 0;
        introTimer = 0;

        console.log(`Switched to level ${difficulty}`);
    }

    function drawGame() {
        const dt = Math.min(p.deltaTime, 50); // safety clamp

        introTimer += dt;

        handleGamePhase(dt);

        handleCamera();

        // --- DRAWING ---
        drawGrid();
        drawPlayer();
        initGetReadyTitle();

        handleFog();

        if (gamePhase === GAME_PHASE.PLAYING) {
            checkExitReached();
        }
    }

    function drawHUD() {
        p.fill(255);
        p.textSize(24);
        p.textAlign(p.LEFT, p.TOP);

        p.text(`HP: ${player.hp}%`, 10, 10);

        const totalSeconds = Math.ceil(timeLeft);

        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;

        // Format with leading zeros: "01:09"
        // .padStart(2, '0') ensures "9" becomes "09"
        const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;

        p.text(`Time: ${timeString}`, 10, 30);

        // Show +30s text if bonus was recently collected
        if (timeBonusTextTimer > 0) {
            p.push();
            // Fade out the text as the timer reaches 0
            let alpha = p.map(timeBonusTextTimer, 0, 2000, 0, 255);
            p.fill(255, 255, 0, alpha); // Yellow color
            p.text('+30s', 150, 30); // Positioned beside the timer
            p.pop();
        }

        p.textAlign(p.RIGHT, p.TOP);
        p.text(
            `DEBUG MODE: ${debugMode ? 'ON' : 'OFF'}`,
            p.windowWidth - 10,
            10,
        );
    }

    function findStartTile() {
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridColumns; x++) {
                if (maze[y][x] === TILE_MAP.start) {
                    player.gridX = x;
                    player.gridY = y;
                    return;
                }
            }
        }
    }

    function checkExitReached() {
        const tile = maze[player.gridY][player.gridX];

        if (tile === TILE_MAP.exit) {
            onLevelComplete();
        }
    }

    function updateTimer() {
        if (!timerRunning) return;

        const now = p.millis();
        const deltaSeconds = (now - lastTimeStamp) / 1000;
        lastTimeStamp = now;

        timeLeft -= deltaSeconds;
        timeLeft = Math.max(timeLeft, 0);

        if (timeLeft <= 0) {
            onTimeUp();
        }
    }

    function updateCamera() {
        // Calculate how much of the world is actually visible at this ZOOM
        const visibleWidth = BASE_WIDTH / ZOOM;
        const visibleHeight = BASE_HEIGHT / ZOOM;

        // The target is: Player Position minus HALF of the VISIBLE area
        const targetX =
            player.gridX * TILE_SIZE + TILE_SIZE / 2 - visibleWidth / 2;
        const targetY =
            player.gridY * TILE_SIZE + TILE_SIZE / 2 - visibleHeight / 2;

        // Smoothly follow the target
        cameraX = p.lerp(cameraX, targetX, CAMERA_LERP);
        cameraY = p.lerp(cameraY, targetY, CAMERA_LERP);

        // Clamp to world bounds so we don't see the "void"
        // We stop the camera when the edge of the visible area hits the world edge
        cameraX = p.constrain(cameraX, 0, worldWidth - visibleWidth);
        cameraY = p.constrain(cameraY, 0, worldHeight - visibleHeight);
    }

    function onPlayerDeath() {
        lossReason = 'You succumbed to the traps.';
        currentGameState = GAME_STATE.GAMEOVER;
        timerRunning = false;
    }

    function onTimeUp() {
        lossReason = 'Your torch burned out in the darkness.';
        currentGameState = GAME_STATE.GAMEOVER;
        timerRunning = false;
    }

    function onLevelComplete() {
        currentGameState = GAME_STATE.VICTORY;
        timerRunning = false;
    }
    function initGetReadyTitle() {
        if (gamePhase !== GAME_PHASE.PLAYING) {
            p.push();
            p.resetMatrix();

            let textAlpha = 255 - fogOpacity;
            p.textAlign(p.CENTER, p.CENTER);
            p.textStyle(p.BOLD);

            let displayStr = '';
            let displaySize = 48;

            // 0 to 1.5 seconds: Intro Header
            if (introTimer < 1500) {
                displayStr = 'GET READY!';
            }
            // 1.5 to 6.5 seconds: The 5, 4, 3, 2, 1 Countdown
            else if (introTimer < 6500) {
                // This math converts 1500-6500ms into the numbers 5 down to 1
                let secondsElapsed = (introTimer - 1500) / 1000;
                displayStr = Math.floor(6 - secondsElapsed).toString();
                displaySize = 90;

                // Subtle "Pop" effect every second
                let pop = p.map(introTimer % 1000, 0, 200, 20, 0, true);
                displaySize += pop;
            }
            // 6.5 seconds until Playing: GO!
            else {
                displayStr = 'GO!';
                displaySize = 100;
            }

            // Drop shadow
            p.fill(0, textAlpha * 0.4);
            p.textSize(displaySize);
            p.text(displayStr, p.windowWidth / 2 + 5, p.windowHeight / 2 + 5);

            // Main Text
            p.fill(255, textAlpha);
            p.text(displayStr, p.windowWidth / 2, p.windowHeight / 2);

            p.pop();
        }
    }

    function handleGamePhase(dt) {
        if (gamePhase === GAME_PHASE.INTRO_REVEAL) {
            transitionAlpha = 0;
            if (introTimer > 1500) gamePhase = GAME_PHASE.INTRO_PAN;
        } else if (gamePhase === GAME_PHASE.INTRO_PAN) {
            // Smoothly increase alpha from 0 to 1 over 2 seconds
            transitionAlpha = p.constrain(transitionAlpha + dt / 5000, 0, 1);

            // Once zoomed in, fade in the fog
            if (transitionAlpha >= 1) {
                fogOpacity = p.constrain(fogOpacity + dt / 5, 0, 255);

                if (fogOpacity >= 255) {
                    gamePhase = GAME_PHASE.PLAYING;
                    lastTimeStamp = p.millis();
                }
            }
        } else {
            // Normal Gameplay
            transitionAlpha = 1;
            fogOpacity = 255;
            moveTimer += dt;
            trapTimer += dt;
            trapDamageTimer -= dt;
            movePlayer();
            checkStandingOnTrap(dt);
            checkPowerUps(dt);
            updateTimer();
        }
    }

    function handleCamera() {
        // --- SMOOTH CAMERA & ZOOM CALCULATION ---
        let finalScale, finalTransX, finalTransY, finalCameraX, finalCameraY;

        // 1. Calculate Bird's-Eye values
        const fullWorldScale = Math.min(
            p.windowWidth / worldWidth,
            p.windowHeight / worldHeight,
        );
        const birdEyeX = (p.windowWidth - worldWidth * fullWorldScale) / 2;
        const birdEyeY = (p.windowHeight - worldHeight * fullWorldScale) / 2;

        if (!enableCamera) {
            // DEBUG MAP MODE: Full view, no panning
            finalScale = fullWorldScale;
            finalTransX = birdEyeX;
            finalTransY = birdEyeY;
            finalCameraX = 0;
            finalCameraY = 0;
        } else {
            // NORMAL GAMEPLAY / INTRO: Zoomed and panned
            const targetScale = scaleFactor * ZOOM;
            const cameraViewX = (p.windowWidth - BASE_WIDTH * scaleFactor) / 2;
            const cameraViewY =
                (p.windowHeight - BASE_HEIGHT * scaleFactor) / 2;

            finalScale = p.lerp(fullWorldScale, targetScale, transitionAlpha);
            finalTransX = p.lerp(birdEyeX, cameraViewX, transitionAlpha);
            finalTransY = p.lerp(birdEyeY, cameraViewY, transitionAlpha);

            updateCamera();
            finalCameraX = cameraX * transitionAlpha;
            finalCameraY = cameraY * transitionAlpha;
        }

        // Apply the transformation
        p.translate(finalTransX, finalTransY);
        p.scale(finalScale);
        p.translate(-finalCameraX, -finalCameraY);
    }

    function handleFog() {
        // Toggle fog based on BOTH debug setting and intro progress
        let shouldShowFog =
            enableFog && (gamePhase === GAME_PHASE.PLAYING || fogOpacity > 0);

        if (shouldShowFog && enableCamera) {
            drawFog();
            p.tint(255, fogOpacity);
            p.image(fogLayer, 0, 0);
            p.noTint();
        }
    }
    //#endregion

    //#region Screens
    function drawMenu() {
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255);
        p.textSize(64);
        p.text('TORCHBOUND', p.windowWidth / 2, p.windowHeight / 2 - 50);

        drawButton('PLAY', p.windowWidth / 2, p.windowHeight / 2 + 50, () => {
            currentGameState = GAME_STATE.LEVEL_SELECT;
        });
    }

    function drawLevelSelect() {
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255);
        p.textSize(32);
        p.text('SELECT A LEVEL', p.windowWidth / 2, 100);

        // Level Buttons
        for (let i = 1; i <= 3; i++) {
            drawButton(
                `Level ${i}: ${LEVELS[i].name}`,
                p.windowWidth / 2,
                150 + i * 80,
                () => {
                    currentLevel = i;
                    loadLevel(i);
                    currentGameState = GAME_STATE.PLAYING;
                },
            );
        }

        // --- BACK BUTTON ---
        // Positioned at the bottom
        drawButton('BACK', p.windowWidth / 2, p.windowHeight - 80, () => {
            currentGameState = GAME_STATE.MENU;
        });
    }

    function drawVictory() {
        p.background(0, 50, 0); // Subtle green
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255);
        p.textSize(48);
        p.text('YOU ESCAPED!', p.windowWidth / 2, p.windowHeight / 2 - 50);

        drawButton(
            'MENU',
            p.windowWidth / 2 - 175,
            p.windowHeight / 2 + 50,
            () => {
                currentGameState = GAME_STATE.MENU;
            },
        );
        drawButton(
            'RETRY',
            p.windowWidth / 2 + 175,
            p.windowHeight / 2 + 50,
            () => {
                loadLevel(currentLevel);
                currentGameState = GAME_STATE.PLAYING;
                p.loop();
            },
        );
    }

    function drawGameOver() {
        p.background(50, 0, 0); // Subtle red
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255);
        p.textSize(48);
        p.text('GAME OVER', p.windowWidth / 2, p.windowHeight / 2 - 80);
        p.textSize(24);
        p.fill(200);
        p.text(
            `Cause: ${lossReason}`,
            p.windowWidth / 2,
            p.windowHeight / 2 - 30,
        );

        drawButton(
            'MENU',
            p.windowWidth / 2 - 175,
            p.windowHeight / 2 + 50,
            () => {
                currentGameState = GAME_STATE.MENU;
            },
        );
        drawButton(
            'RETRY',
            p.windowWidth / 2 + 175,
            p.windowHeight / 2 + 50,
            () => {
                loadLevel(currentLevel);
                currentGameState = GAME_STATE.PLAYING;
                p.loop();
            },
        );
    }

    function drawButton(label, x, y, onClick) {
        const btnW = 300;
        const btnH = 50;

        // Check hover
        let isHovered =
            p.mouseX > x - btnW / 2 &&
            p.mouseX < x + btnW / 2 &&
            p.mouseY > y - btnH / 2 &&
            p.mouseY < y + btnH / 2;

        p.fill(isHovered ? 100 : 50);
        p.rectMode(p.CENTER);
        p.rect(x, y, btnW, btnH, 5);

        p.fill(255);
        p.textSize(20);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(label, x, y);

        if (isHovered && p.mouseIsPressed) {
            // Debounce: prevent multiple clicks
            p.mouseIsPressed = false;
            onClick();
        }
    }
    //#endregion

    //#region Window Responsiveness
    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        resizeGame();
    };

    function resizeGame() {
        scaleFactor = Math.min(
            p.windowWidth / BASE_WIDTH,
            p.windowHeight / BASE_HEIGHT,
        );
    }
    //#endregion

    //#region World
    function drawGrid() {
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridColumns; x++) {
                const tile = maze[y][x];
                p.noStroke();

                if (tile === TILE_MAP.wall) p.fill(100);
                else if (tile === TILE_MAP.start) p.fill(50, 200, 50);
                else if (tile === TILE_MAP.exit) p.fill(50, 100, 200);
                else if (tile === TILE_MAP.floor) p.fill(20);
                else if (tile === TILE_MAP.timePowerUp)
                    p.fill(255, 255, 0); // Yellow
                else if (tile === TILE_MAP.torchPowerUp)
                    p.fill(255, 150, 0); // Orange
                else if (tile === TILE_MAP.visionPowerUp)
                    p.fill(0, 255, 255); // Cyan
                // Trap Rendering
                else if (TRAPS[tile]) {
                    const active = isTrapActive(tile, x, y);
                    if (tile === TILE_MAP.fireTrap)
                        // Red
                        p.fill(active ? [200, 80, 50] : 60);
                    else if (tile === TILE_MAP.resetTrap)
                        // Purple
                        p.fill(active ? [150, 0, 255] : 60);
                    else if (tile === TILE_MAP.darknessTrap)
                        p.fill(active ? [0, 0, 0] : 60); // Black
                }

                p.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    //#endregion

    //#region Lighting
    function initFog() {
        fogLayer = p.createGraphics(worldWidth, worldHeight);
        fogLayer.pixelDensity(1);
        fogLayer.noSmooth();
    }

    function drawFog() {
        fogLayer.clear();
        fogLayer.noStroke();

        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridColumns; x++) {
                let dx = x - player.gridX;
                let dy = y - player.gridY;
                let distance = Math.sqrt(dx * dx + dy * dy);

                let darkness = p.map(
                    distance,
                    torchRadius - 1,
                    torchRadius + 1,
                    0,
                    255,
                );
                darkness = p.constrain(darkness, 0, 255);

                fogLayer.fill(0, darkness);
                fogLayer.rect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE,
                );
            }
        }
    }
    //#endregion

    //#region Player
    function drawPlayer() {
        p.fill(220);
        p.rect(
            player.gridX * TILE_SIZE,
            player.gridY * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
        );
    }

    function movePlayer() {
        if (moveTimer < MOVE_DELAY_MS) return;

        let dx = 0;
        let dy = 0;

        if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) dy = -1;
        else if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) dy = 1;
        else if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) dx = -1;
        else if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) dx = 1;
        else return;

        if (isWalkable(player.gridX + dx, player.gridY + dy)) {
            player.gridX += dx;
            player.gridY += dy;
        }

        moveTimer = 0;
    }

    function isWalkable(x, y) {
        if (x < 0 || y < 0 || x >= gridColumns || y >= gridRows) {
            return false;
        }
        return maze[y][x] !== 1;
    }

    function takeDamage(amount) {
        player.hp -= amount;
        player.hp = p.constrain(player.hp, 0, player.maxHp);

        if (player.hp <= 0) {
            onPlayerDeath();
        }
    }
    //#endregion

    //#region Traps
    function isTrapActive(tileId, x, y) {
        const trap = TRAPS[tileId];
        if (!trap) return false;

        const cycle = trap.activeTime + trap.inactiveTime;

        // Create a unique offset based on position to unsync traps
        let offset = trap.randomized ? (x * 777 + y * 999) % cycle : 0;

        const timeInCycle = (trapTimer + offset) % cycle;
        return timeInCycle < trap.activeTime;
    }

    function checkStandingOnTrap(dt) {
        const x = player.gridX;
        const y = player.gridY;
        const tile = maze[y][x];
        const trap = TRAPS[tile];

        if (darknessEffectTimer > 0) {
            darknessEffectTimer -= dt;
        }

        if (!trap || !isTrapActive(tile, x, y)) {
            // If the timer is done, recover torch radius; otherwise, keep it shrunk
            if (
                darknessEffectTimer <= 0 &&
                torchRadius < 3 &&
                torchEffectTimer <= 0
            ) {
                torchRadius = p.lerp(torchRadius, 3, 0.05);
            }
            trapDamageTimer = 0;
            return;
        }

        switch (trap.type) {
            case 'damage':
                if (trapDamageTimer <= 0) {
                    takeDamage(trap.damage);
                    trapDamageTimer = TRAP_DAMAGE_INTERVAL_MS;
                }
                break;

            case 'reset':
                console.log('Reset Trap Triggered!');
                findStartTile();
                break;

            case 'darkness':
                // Trigger the 5-second effect
                darknessEffectTimer = DARKNESS_DURATION;
                torchEffectTimer = 0;
                visionEffectTimer = 0;
                break;
        }

        // Apply the effect if the timer is active
        if (darknessEffectTimer > 0) {
            torchRadius = p.lerp(torchRadius, 0.25, 0.1);
            enableCamera = true;
        }
    }
    //#endregion

    //#region Power-ups
    function checkPowerUps(dt) {
        const x = player.gridX;
        const y = player.gridY;
        const tile = maze[y][x];

        // Decay timers
        if (timeBonusTextTimer > 0) timeBonusTextTimer -= dt;
        if (torchEffectTimer > 0) torchEffectTimer -= dt;
        if (visionEffectTimer > 0) visionEffectTimer -= dt;

        // Collection logic
        if (tile === TILE_MAP.timePowerUp) {
            timeLeft += 30;
            timeBonusTextTimer = 3000;
            maze[y][x] = 0; // Consume the item
        } else if (tile === TILE_MAP.torchPowerUp) {
            torchEffectTimer = POWER_UP_DURATIONS.TORCH;
            maze[y][x] = 0;
        } else if (tile === TILE_MAP.visionPowerUp) {
            visionEffectTimer = POWER_UP_DURATIONS.VISION;
            maze[y][x] = 0;
        }

        // Apply Effects
        if (visionEffectTimer > 0) {
            enableCamera = false;
        } else if (visionEffectTimer <= 0 && darknessEffectTimer <= 0) {
            if (!debugMode) enableCamera = true;
        }

        if (torchEffectTimer > 0) {
            torchRadius = p.lerp(torchRadius, 6, 0.1);
        } else if (torchEffectTimer <= 0 && darknessEffectTimer <= 0) {
            torchRadius = p.lerp(torchRadius, 3, 0.1);
        }
    }
    //#endregion
});
