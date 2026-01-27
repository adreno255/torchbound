const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const TILE_SIZE = 32;
const MOVE_DELAY = 8;

new p5((p) => {
    let scaleFactor = 1;
    let moveCooldown = 0;

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.pixelDensity(1);
        p.noSmooth();
        resizeGame();
    };

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

    p.draw = () => {
        p.background(20);

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
        p.background(30);

        console.log(moveCooldown);
        moveCooldown--;

        movePlayer();

        drawGrid();

        drawPlayer();
    }

    function drawGrid() {
        p.stroke(50);
        for (let x = 0; x < 25; x++) {
            for (let y = 0; y < 18; y++) {
                p.noFill();
                p.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    let player = {
        gridX: 12,
        gridY: 9,
    };

    function drawPlayer() {
        const x = player.gridX * TILE_SIZE;
        const y = player.gridY * TILE_SIZE;

        p.fill(200);
        p.rect(x, y, TILE_SIZE, TILE_SIZE);
    }

    function movePlayer() {
        if (moveCooldown > 0) return;

        if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) {
            player.gridY--;
        } else if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) {
            player.gridY++;
        } else if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) {
            player.gridX--;
        } else if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) {
            player.gridX++;
        } else {
            return;
        }

        clampPlayer();
        moveCooldown = MOVE_DELAY;
    }

    function clampPlayer() {
        player.gridX = p.constrain(player.gridX, 0, 24);
        player.gridY = p.constrain(player.gridY, 0, 17);
    }
});
