const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const TILE_SIZE = 32;
const MOVE_DELAY_MS = 400;
const GRID_COLS = 50;
const GRID_ROWS = 36;
const ENABLE_FOG = false;
const TRAP_DAMAGE_INTERVAL_MS = 500;
const LEVEL_TIME_S = 40;
const WORLD_WIDTH = GRID_COLS * TILE_SIZE;
const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE;
const ENABLE_CAMERA = false;

new p5((p) => {
    //#region Variables
    let scaleFactor = 1;
    let moveTimer = 0;
    let player = {
        gridX: 12,
        gridY: 7,
        hp: 100,
        maxHp: 100,
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
    // prettier-ignore
    // prettier-ignore
    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
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
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    let fogLayer;
    let TORCH_RADIUS = 2;
    let trapTimer = 0;
    let trapDamageTimer = 0;
    let timeLeft = LEVEL_TIME_S;
    let lastTimeStamp = 0;
    let timerRunning = true;
    let cameraX = 0;
    let cameraY = 0;
    let zoom = 1.5;
    //#endregion

    //#region p5 Core Functions
    p.setup = () => {
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

        if (ENABLE_CAMERA) {
            // --- CAMERA VIEW (Focus on Player) ---
            // Center the 800x600 viewport in the window
            p.translate(
                (p.windowWidth - BASE_WIDTH * scaleFactor) / 2,
                (p.windowHeight - BASE_HEIGHT * scaleFactor) / 2,
            );
            p.scale(scaleFactor * zoom);

            updateCamera();
            p.translate(-cameraX, -cameraY);
        } else {
            // --- BIRDS-EYE VIEW (Center Full Maze) ---
            // 1. Calculate a scale that fits the 50x36 maze exactly
            let fullWorldScale = Math.min(
                p.windowWidth / WORLD_WIDTH,
                p.windowHeight / WORLD_HEIGHT,
            );

            // 2. Center based on the ACTUAL world size * the new scale
            // This stops the "hugging the right boundary" issue
            p.translate(
                (p.windowWidth - WORLD_WIDTH * fullWorldScale) / 2,
                (p.windowHeight - WORLD_HEIGHT * fullWorldScale) / 2,
            );
            p.scale(fullWorldScale);
        }

        drawGame();

        p.pop();

        drawHUD();
    };

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

        if (ENABLE_FOG) {
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
        p.text(`Time: ${Math.ceil(timeLeft)}s`, 10, 30);
    }

    function findStartTile() {
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < GRID_COLS; x++) {
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
        // Calculate how much of the world is actually visible at this zoom
        const visibleWidth = BASE_WIDTH / zoom;
        const visibleHeight = BASE_HEIGHT / zoom;

        // The target is: Player Position minus HALF of the VISIBLE area
        const targetX =
            player.gridX * TILE_SIZE + TILE_SIZE / 2 - visibleWidth / 2;
        const targetY =
            player.gridY * TILE_SIZE + TILE_SIZE / 2 - visibleHeight / 2;

        // Smoothly follow the target
        cameraX = p.lerp(cameraX, targetX, 0.05);
        cameraY = p.lerp(cameraY, targetY, 0.05);

        // Clamp to world bounds so we don't see the "void"
        // We stop the camera when the edge of the visible area hits the world edge
        cameraX = p.constrain(cameraX, 0, WORLD_WIDTH - visibleWidth);
        cameraY = p.constrain(cameraY, 0, WORLD_HEIGHT - visibleHeight);
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
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < GRID_COLS; x++) {
                if (maze[y][x] === TILE_MAP.wall) {
                    p.fill(70);
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
        fogLayer = p.createGraphics(WORLD_WIDTH, WORLD_HEIGHT);
        fogLayer.pixelDensity(1);
        fogLayer.noSmooth();
    }

    function drawFog() {
        fogLayer.clear();
        fogLayer.noStroke();

        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < GRID_COLS; x++) {
                let dx = x - player.gridX;
                let dy = y - player.gridY;
                let distance = Math.sqrt(dx * dx + dy * dy);

                let darkness = p.map(
                    distance,
                    TORCH_RADIUS - 1,
                    TORCH_RADIUS + 1,
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
        if (x < 0 || y < 0 || x >= GRID_COLS || y >= GRID_ROWS) {
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
