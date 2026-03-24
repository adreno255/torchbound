// ============================================================
// common/levels.js
// Level definitions: display name, time limit, and pre-generated maze.
//
// Mazes are generated once at module load time (startup) and reused
// for the entire session.  When the player retries a level, main.js
// performs a deep-copy of the stored maze so that collected power-ups
// and trap states reset properly without regenerating the layout.
//
// Deep-copy pattern used in main.js:
//   maze = levelData.maze.map(row => row.slice())
//
// Level difficulty progression:
//   Level 1 — 25×15, 3% traps,  2% powerups, 120 s
//   Level 2 — 30×25, 5% traps,  5% powerups, 180 s
//   Level 3 — 40×25, 8% traps,  5% powerups, 300 s
//   Level 4 — 45×35, 12% traps, 3% powerups, 420 s
//   Level 5 — 65×45, 15% traps, 2% powerups, 600 s
//
// Tileset and trap sheet assignments per level:
//   Levels 1–2  → map-light.png   + traps-light.png
//   Levels 3–4  → map-dark.png    + traps-light.png (level 3) / traps-dark.png (level 4)
//   Level  5    → map-dark-v2.png + traps-dark.png
// ============================================================

import { generateMaze } from './mazeGenerator.js';

/**
 * Static level definitions.
 * Each level object contains:
 *   name  {string}     — display name shown on Level Select and Victory screens
 *   maze  {number[][]} — pre-generated 2-D tile grid (deep-copy before use!)
 *   time  {number}     — countdown start value in seconds
 *
 * Indexed by level number (1–5).
 *
 * @type {Record<number, { name: string, maze: number[][], time: number }>}
 */
// prettier-ignore
export const LEVELS = {
    1: {
        name: 'The Descent',
        maze: generateMaze(25, 15, 0.03, 0.02),
        time: 120,
    },
    2: {
        name: 'Trial of Shadows',
        maze: generateMaze(30, 25, 0.05, 0.05),
        time: 180,
    },
    3: {
        name: 'The Grand Labyrinth',
        maze: generateMaze(40, 25, 0.08, 0.05),
        time: 300,
    },
    4: {
        name: 'Corridor of Embers',
        maze: generateMaze(45, 35, 0.12, 0.03),
        time: 420,
    },
    5: {
        name: 'The Abyssal Core',
        maze: generateMaze(65, 45, 0.15, 0.02),
        time: 600,
    },
};
