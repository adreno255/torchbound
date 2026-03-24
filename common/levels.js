// ============================================================
// levels.js
// Level definitions: name, time limit, and generated maze.
// Mazes are generated once at startup and reused per session.
// ============================================================

import { generateMaze } from './mazeGenerator.js';

// prettier-ignore
export const LEVELS = {
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
        maze: generateMaze(40, 25, 0.08, 0.05),
        time: 300
    },
    4: {
        name: "Corridor of Embers",
        maze: generateMaze(45, 35, 0.12, 0.03),
        time: 420
    },
    5: {
        name: "The Abyssal Core",
        maze: generateMaze(65, 45, 0.15, 0.02),
        time: 600
    }
};
