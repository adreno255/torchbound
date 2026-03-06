// ============================================================
// mazeGenerator.js
// Procedural maze generation using recursive backtracking.
// Handles placement of: start, exit, traps, and power-ups.
// ============================================================

/**
 * Generates a random maze grid.
 * Tile values:
 *   0 = floor, 1 = wall, 2 = start, 3 = exit
 *   4 = fire trap, 5 = reset trap, 6 = darkness trap
 *   7 = time power-up, 8 = torch power-up, 9 = vision power-up
 *
 * @param {number} cols - Desired number of columns (snapped to odd)
 * @param {number} rows - Desired number of rows (snapped to odd)
 * @param {number} trapChance - Probability (0–1) of a floor tile becoming a trap
 * @param {number} powerUpChance - Probability (0–1) of a floor tile becoming a power-up
 * @returns {number[][]} 2D maze grid
 */
export function generateMaze(
    cols,
    rows,
    trapChance = 0.05,
    powerUpChance = 0.02,
) {
    // Force dimensions to be odd — required for recursive backtracking
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

    carve(1, 1);

    // Place Start tile on the left wall
    newMaze[1][0] = 2;

    // Place Exit tile: scan bottom-right for first available floor, then open the right wall
    let placedExit = false;
    for (let y = H - 2; y > 0 && !placedExit; y--) {
        for (let x = W - 2; x > 0 && !placedExit; x--) {
            if (newMaze[y][x] === 0) {
                newMaze[y][W - 1] = 3;
                placedExit = true;
            }
        }
    }

    // Scatter traps on floor tiles
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            if (newMaze[y][x] === 0 && Math.random() < trapChance) {
                newMaze[y][x] = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6
            }
        }
    }

    // Scatter power-ups on remaining floor tiles
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            if (newMaze[y][x] === 0 && Math.random() < powerUpChance) {
                newMaze[y][x] = Math.floor(Math.random() * 3) + 7; // 7, 8, or 9
            }
        }
    }

    return newMaze;
}
