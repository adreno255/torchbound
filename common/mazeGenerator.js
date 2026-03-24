// ============================================================
// common/mazeGenerator.js
// Procedural maze generation using recursive backtracking.
//
// Algorithm overview (Perfect Maze / DFS Backtracker):
//   1. Start with a grid of all walls.
//   2. Pick a starting cell and carve a path to each unvisited
//      neighbour (jumping 2 cells at a time to leave wall columns
//      between corridors).
//   3. Repeat recursively until all reachable cells are visited.
//   Result: a "perfect" maze — exactly one path between any two cells.
//
// After carving, start, exit, traps, and power-ups are placed.
// Tile value legend — see TILE_MAP in constants.js:
//   0 = floor      1 = wall     2 = start    3 = exit
//   4 = spike trap  5 = pit trap  6 = darkness trap
//   7 = time orb   8 = torch boost  9 = vision orb
// ============================================================

/**
 * Generates a random maze grid using recursive backtracking.
 *
 * Grid dimensions are forced to odd numbers — the algorithm requires
 * odd-sized grids so that a 1-cell border of walls always surrounds
 * the carved corridors and no two corridors accidentally merge.
 *
 * Placement rules:
 *   - Start tile: always at [0][1] (left wall, second row).
 *   - Exit tile:  first available floor cell scanning from the
 *     bottom-right, opened through the right wall boundary.
 *   - Traps:      placed on remaining floor tiles with probability trapChance.
 *     Randomly assigned to one of three trap types (4, 5, or 6).
 *   - Power-ups:  placed after traps on surviving floor tiles with
 *     probability powerUpChance.  Randomly assigned to types 7, 8, or 9.
 *
 * @param {number} cols         - Desired number of columns (snapped to odd)
 * @param {number} rows         - Desired number of rows (snapped to odd)
 * @param {number} [trapChance=0.05]    - Probability (0–1) that a floor tile becomes a trap
 * @param {number} [powerUpChance=0.02] - Probability (0–1) that a floor tile becomes a power-up
 * @returns {number[][]} 2-D maze grid of integer tile values
 */
export function generateMaze(
    cols,
    rows,
    trapChance = 0.05,
    powerUpChance = 0.02,
) {
    // ── Snap dimensions to odd ────────────────────────────────────────────
    // The DFS carver steps in increments of 2, so even dimensions would
    // produce a final row/col that is unreachable and always stays a wall.
    const W = cols % 2 === 0 ? cols - 1 : cols;
    const H = rows % 2 === 0 ? rows - 1 : rows;

    // Start with every cell walled
    let newMaze = Array.from({ length: H }, () => Array(W).fill(1));

    /** Returns true if (x, y) is inside the carveable interior. */
    const isInside = (x, y) => x > 0 && x < W - 1 && y > 0 && y < H - 1;

    /**
     * Recursive DFS carver.
     * Carves the current cell to floor, then visits each unvisited
     * neighbour (2 cells away) in random order, carving the wall
     * between them before recursing.
     *
     * @param {number} x
     * @param {number} y
     */
    function carve(x, y) {
        newMaze[y][x] = 0; // mark current cell as floor

        // Shuffle the four cardinal directions
        let dirs = [
            [0, -2], // north
            [0, 2], // south
            [-2, 0], // west
            [2, 0], // east
        ].sort(() => Math.random() - 0.5);

        for (let [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (isInside(nx, ny) && newMaze[ny][nx] === 1) {
                // Carve the wall between current cell and neighbour
                newMaze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }

    // Begin carving from (1, 1) — top-left interior cell
    carve(1, 1);

    // ── Place start tile ──────────────────────────────────────────────────
    // Open the left boundary wall at row 1. The player always spawns here.
    newMaze[1][0] = 2;

    // ── Place exit tile ───────────────────────────────────────────────────
    // Scan from the bottom-right to find the first interior floor cell,
    // then open the right boundary wall at that row.
    let placedExit = false;
    for (let y = H - 2; y > 0 && !placedExit; y--) {
        for (let x = W - 2; x > 0 && !placedExit; x--) {
            if (newMaze[y][x] === 0) {
                newMaze[y][W - 1] = 3;
                placedExit = true;
            }
        }
    }

    // ── Scatter traps ─────────────────────────────────────────────────────
    // Each interior floor tile independently rolls against trapChance.
    // Trap type (4, 5, or 6) is chosen uniformly at random.
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            if (newMaze[y][x] === 0 && Math.random() < trapChance) {
                newMaze[y][x] = Math.floor(Math.random() * 3) + 4; // 4 | 5 | 6
            }
        }
    }

    // ── Scatter power-ups ─────────────────────────────────────────────────
    // Only tiles that are still plain floor (value 0) are eligible.
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            if (newMaze[y][x] === 0 && Math.random() < powerUpChance) {
                newMaze[y][x] = Math.floor(Math.random() * 3) + 7; // 7 | 8 | 9
            }
        }
    }

    return newMaze;
}
