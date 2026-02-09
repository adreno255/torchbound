//#region Globals
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const TILE_SIZE = 32;
const MOVE_DELAY_MS = 400;
const TRAP_DAMAGE_INTERVAL_MS = 500;
const LEVEL_TIME_S = 300;
const ZOOM = 1.5;
const CAMERA_LERP = 0.05;
// prettier-ignore
const LEVELS = {
    1: { 
        cols: 25, 
        rows: 18,
        maze: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,1,0,0,0,0,0,2,0,0,0,1,0,0,0,0,3,0,0,0,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
            [1,0,1,0,2,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1],
            [1,0,0,3,0,0,0,0,1,0,0,0,1,0,2,0,1,3,1,0,0,0,1,0,1],
            [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,1,0,0,2,1,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1],
            [4,0,1,0,0,0,0,0,3,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,5],
            [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1],
            [1,0,2,0,1,0,0,0,0,0,0,2,0,0,1,0,3,0,1,0,2,0,1,0,1],
            [1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,3,1,0,2,0,0,0,1,0,0,0,0,3,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,2,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]

        ]
    },
    2: { 
        cols: 50, 
        rows: 36,
        maze: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [4,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,2,0,0,0,1,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,2,0,0,0,1,0,0,0,0,3,0,0,0,0,1,0,0,0,0,0,3,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,0,1,0,1,0,1],
            [1,0,1,0,2,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,1,0,1,0,1,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,1,0,1,0,1,0,1,0,1],
            [1,0,0,3,0,0,0,0,1,0,0,0,1,0,2,0,1,3,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,0,2,0,1,3,1,0,0,0,0,1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,1,0,0,2,1,0,1,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,1,0,0,2,1,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,0,1],
            [1,0,1,0,0,0,0,0,3,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,3,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
            [1,0,2,0,1,0,0,0,0,0,0,2,0,0,1,0,3,0,1,0,2,0,1,0,1,0,2,0,1,0,0,0,0,0,0,2,0,0,1,0,3,0,1,0,2,0,1,0,0,1],
            [1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,3,1,0,2,0,0,0,1,0,0,0,0,3,0,0,0,0,0,0,0,0,1,0,1,3,1,0,2,0,0,0,1,0,0,0,0,3,0,0,0,0,0,0,0,0,1,0,0,1],
            [1,0,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,2,0,0,1,0,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,2,0,0,0,1],
            [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,2,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,2,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1],
            [1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1],
            [1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,2,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,2,0,0,0,1,0,1,0,1,0,1,0,1],
            [1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1],
            [1,0,1,3,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    },
};
const TILE_MAP = {
    floor: 0,
    wall: 1,
    spikeTrap: 2,
    fireTrap: 3,
    start: 4,
    exit: 5,
};
const TRAPS = {
    2: {
        name: 'spikes',
        damage: 10,
        activeTime: 800, // 0.8 seconds ON
        inactiveTime: 3000, // 3 seconds OFF
    },
    3: {
        name: 'fire',
        damage: 25,
        activeTime: 2000, // 2 second ON
        inactiveTime: 1500, // 1.5 seconds OFF
    },
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
    let timeLeft = LEVEL_TIME_S;
    let lastTimeStamp = 0;
    let timerRunning = true;
    let cameraX = 0;
    let cameraY = 0;

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

        p.push();

        if (enableCamera) {
            // --- CAMERA VIEW (Focus on Player) ---
            // Center the 800x600 viewport in the window
            p.translate(
                (p.windowWidth - BASE_WIDTH * scaleFactor) / 2,
                (p.windowHeight - BASE_HEIGHT * scaleFactor) / 2,
            );
            p.scale(scaleFactor * ZOOM);

            updateCamera();
            p.translate(-cameraX, -cameraY);
        } else {
            // --- BIRDS-EYE VIEW (Center Full Maze) ---
            // 1. Calculate a scale that fits the 50x36 maze exactly
            let fullWorldScale = Math.min(
                p.windowWidth / worldWidth,
                p.windowHeight / worldHeight,
            );

            // 2. Center based on the ACTUAL world size * the new scale
            // This stops the "hugging the right boundary" issue
            p.translate(
                (p.windowWidth - worldWidth * fullWorldScale) / 2,
                (p.windowHeight - worldHeight * fullWorldScale) / 2,
            );
            p.scale(fullWorldScale);
        }

        drawGame();

        p.pop();

        drawHUD();
    };

    function loadLevel(difficulty) {
        if (!LEVELS[difficulty]) return; // Security check

        // 1. Update the grid dimensions
        const levelData = LEVELS[difficulty];
        gridColumns = levelData.cols;
        gridRows = levelData.rows;
        maze = levelData.maze;

        // 2. Recalculate world size
        worldWidth = gridColumns * TILE_SIZE;
        worldHeight = gridRows * TILE_SIZE;

        // 3. Reset Fog Buffer
        initFog();

        // 4. Relocate player to the start (4) of the new maze
        findStartTile();

        // 5. Reset timer
        timeLeft = LEVEL_TIME_S;

        console.log(`Switched to level ${difficulty}`);
    }

    function drawGame() {
        updateTimer();

        const dt = Math.min(p.deltaTime, 50); // safety clamp

        moveTimer += dt;
        trapTimer += dt;
        trapDamageTimer -= dt;

        movePlayer();

        checkStandingOnTrap();

        drawGrid();

        drawPlayer();

        if (enableFog) {
            drawFog();
            p.image(fogLayer, 0, 0);
        }

        checkExitReached();
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
        console.log('Player died');
        timerRunning = false;
        p.noLoop(); // temporary game over
    }

    function onLevelComplete() {
        console.log('Level escaped!');
        timerRunning = false;
        p.noLoop(); // temporary victory state
    }

    function onTimeUp() {
        console.log("Time's up!");
        timerRunning = false;
        p.noLoop(); // temporary game over
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
                if (maze[y][x] === TILE_MAP.wall) {
                    p.fill(100);
                } else if (maze[y][x] === TILE_MAP.spikeTrap) {
                    const tile = maze[y][x];
                    const active = isTrapActive(tile);

                    if (active) {
                        p.fill(255, 255, 0); // active trap (danger)
                    } else {
                        p.fill(60); // inactive trap (safe)
                    }
                } else if (maze[y][x] === TILE_MAP.fireTrap) {
                    const tile = maze[y][x];
                    const active = isTrapActive(tile);

                    if (active) {
                        p.fill(200, 80, 50); // active trap (danger)
                    } else {
                        p.fill(60); // inactive trap (safe)
                    }
                } else if (maze[y][x] === TILE_MAP.start) {
                    p.fill(50, 200, 50);
                } else if (maze[y][x] === TILE_MAP.exit) {
                    p.fill(50, 100, 200);
                } else {
                    p.fill(20); // TILE_MAP.floor => 0
                }

                p.noStroke();
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
    function isTrapActive(tileId) {
        const trap = TRAPS[tileId];
        if (!trap) return false;

        const cycle = trap.activeTime + trap.inactiveTime;
        const timeInCycle = trapTimer % cycle;

        return timeInCycle < trap.activeTime;
    }

    function checkStandingOnTrap() {
        const x = player.gridX;
        const y = player.gridY;

        const tile = maze[y][x];
        const trap = TRAPS[tile];
        if (!trap) return;

        if (!isTrapActive(tile)) {
            trapDamageTimer = 0; // reset if safe
            return;
        }

        if (trapDamageTimer <= 0) {
            takeDamage(trap.damage);
            trapDamageTimer = TRAP_DAMAGE_INTERVAL_MS;
        }
    }
    //#endregion
});
