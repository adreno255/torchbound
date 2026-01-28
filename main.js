const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const TILE_SIZE = 32;
const MOVE_DELAY = 20;
const GRID_COLS = 25;
const GRID_ROWS = 18;
const ENABLE_FOG = true;
const TRAP_DAMAGE_DELAY = 30;

new p5((p) => {
    //#region Variables
    let scaleFactor = 1;
    let moveCooldown = 0;
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
    }
    const TRAPS = {
        2: {
            name: "spikes",
            damage: 10,
            activeTime: 40,   // frames ON
            inactiveTime: 180 // frames OFF
        },
        3: {
            name: "fire",
            damage: 25,
            activeTime: 60,
            inactiveTime: 90
        }
    };
    // prettier-ignore
    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,2,0,0,0,1,0,0,0,0,3,0,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,2,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1],
        [1,0,0,3,0,0,0,0,1,0,0,0,1,0,2,0,1,3,1,0,0,0,1,0,1],
        [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,1,0,0,2,1,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1],
        [1,0,1,0,0,0,0,0,3,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,1],
        [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1],
        [1,0,2,0,1,0,0,0,0,0,0,2,0,0,1,0,3,0,1,0,2,0,1,0,1],
        [1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,3,1,0,2,0,0,0,1,0,0,0,0,3,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,2,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    let fogLayer;
    let TORCH_RADIUS = 3;
    let trapTimer = 0;
    let trapDamageCooldown = 0;
    //#endregion

    //#region p5 Core Functions
    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.pixelDensity(1);
        p.noSmooth();
        resizeGame();
        initFog();
    };

    
    p.draw = () => {
        p.background(0);
        
        p.push();
        p.translate(
            (p.windowWidth - BASE_WIDTH * scaleFactor) / 2,
            (p.windowHeight - BASE_HEIGHT * scaleFactor) / 2,
        );
        p.scale(scaleFactor);
        
        drawGame();
        
        p.pop();
    };
    
    function drawGame() {
        moveCooldown--;
        trapTimer++;
        
        movePlayer();

        checkStandingOnTrap();
        
        drawGrid();
        
        drawPlayer();
        
        if (ENABLE_FOG){
            drawFog();
            p.image(fogLayer, 0, 0);
        }
        
        drawHUD();
    }

    function drawHUD() {
        p.fill(255);
        p.textSize(16);
        p.textAlign(p.LEFT, p.TOP);
        p.text(`HP: ${player.hp}%`, 10, 10);
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
        fogLayer = p.createGraphics(BASE_WIDTH, BASE_HEIGHT);
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
        if (moveCooldown > 0) return;


        let nextX = player.gridX;
        let nextY = player.gridY;

        if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) {
            nextY--;
        } else if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) {
            nextY++;
        } else if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) {
            nextX--;
        } else if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) {
            nextX++;
        } else {
            return;
        }

        if (isWalkable(nextX, nextY)) {
            player.gridX = nextX;
            player.gridY = nextY;
        }

        moveCooldown = MOVE_DELAY;
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

    function onPlayerDeath() {
        console.log("Player died");
        p.noLoop(); // temporary game over
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
        if (trapDamageCooldown > 0) {
            trapDamageCooldown--;
            return;
        }

        const x = player.gridX;
        const y = player.gridY;
        const tile = maze[y][x];
        const trap = TRAPS[tile];

        if (!trap) return;

        if (isTrapActive(tile)) {
            takeDamage(trap.damage);
            trapDamageCooldown = TRAP_DAMAGE_DELAY;
        }
    }
    //#endregion
});
