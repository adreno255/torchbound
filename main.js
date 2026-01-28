const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const TILE_SIZE = 32;
const MOVE_DELAY = 20;
const GRID_COLS = 25;
const GRID_ROWS = 18;
const ENABLE_FOG = true;

new p5((p) => {
    //#region Variables
    let scaleFactor = 1;
    let moveCooldown = 0;
    let player = {
        gridX: 12,
        gridY: 7,
    };
    // prettier-ignore
    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,1],
        [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1],
        [1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,1],
        [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
        [1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,0,0,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    let fogLayer;
    let TORCH_RADIUS = 3;
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
        
        movePlayer();
        
        drawGrid();
        
        drawPlayer();
        
        if (ENABLE_FOG){
            drawFog();
            p.image(fogLayer, 0, 0);
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
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < GRID_COLS; x++) {
                if (maze[y][x] === 1) {
                    p.fill(70);
                } else {
                    p.fill(20);
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
        return maze[y][x] === 0;
    }
    //#endregion
});
