# Torchbound

A 2D pixel-style top-down maze adventure browser-based game built with p5.js.

## Game Overview

Torchbound is a 2D, pixel-style, top-down maze adventure browser-based game using p5.js where the player must escape a series of dark, trap-filled environments using only a torch to see their surroundings. The maze is covered in darkness, and only the area illuminated by the player’s torch is visible, creating a fog-of-war effect that forces players to rely on memory, exploration, and careful movement.

The game takes place in a mysterious and dangerous dungeon. Each level presents a new maze layout, more dangerous traps, and tighter time limits. The player must balance exploration, speed, and survival in order to achieve the highest possible score.

## Game Objective

The main objective of Torchbound is to reach the exit of each maze while maintaining as much health and time as possible.

Players are encouraged not only to survive, but to:

- Finish levels quickly
- Avoid debuffs from traps
- Make efficient decisions under limited visibility

Higher performance results in higher scores, which are recorded in a leaderboard system.

## Gameplay Mechanics

### Player Movement

- The player moves using WASD or arrow keys
- Movement is limited to four directions
- Movement is grid-based and time-controlled (not frame-dependent)
- Walls block movement and cannot be passed through

### Fog of War / Torch System

- The maze is completely dark by default
- Only a circular area around the player is visible
- The torch radius determines how much of the maze can be seen
- Torch radius can be temporarily modified through power-ups
- Fog dynamically updates based on player position and camera movement

### Camera System

- The game uses a player-focused camera that follows the player smoothly
- The camera pans cinematically at the start of each level
- The visible area represents only a portion of the world, increasing tension and uncertainty
- A brief full-map reveal occurs before gameplay begins

### Maze and Levels

- The game consists of up to 5 levels
- Each level features:
    - A unique maze layout
    - An entrance and an exit
    - Traps placed inside the maze
- Difficulty increases with each level through:
    - More complex paths
    - More traps
    - Less power-ups

### Health System

- The player has 100 HP instead of multiple lives
- HP is reduced gradually if the player remains on an active damage trap
- If HP reaches 0, the game ends

This system allows room for mistakes while still discouraging careless movement.

### Timer System

- Each level has a countdown timer.
- If time runs out, the player loses the level.
- Extra time can be gained through power-ups.

### Trap System

Traps are designed to be timing-based, allowing skilled players to pass safely.

- Traps alternate between active and inactive states
- Standing on a trap while it becomes active will cause damage
- Damage is applied gradually over time, not instantly
- Trap behavior is time-based and consistent across different frame rates
- Trap Types:
    - Spike Trap – Gradually reduces player HP while active
    - Pit Trap – Sends the player back to the starting position
    - Darkness Trap – Temporarily reduces the torch radius

### Power-Ups

Items appear in the maze that help the player:

- **Torch Boost** – Temporarily increases torch radius
- **Time Crystal** – Adds extra seconds to the level timer
- **Vision Orb** – Reveals the entire maze briefly before darkness returns

### Scoring System

Each level has a performance score based on how well the player survives and how fast they finish.

A level’s score is calculated using:

- Remaining HP = 1 HP is equivalent to 10 points
- Remaining Time = 1 second is equivalent to 20 points

Example concept:

- Higher HP and more remaining time = higher score

At the end of a level, the score is added to the total game score.

Higher HP and more remaining time result in a higher score. At the end of each level, the score is added to the total game score.

### Leaderboard System

- The game stores the player’s per-level and overall score after completing levels.
- The highest scores are saved locally (using browser’s local storage).
- Players can see a leaderboard showing the best runs.

This encourages replayability and competition.

## Winning and Losing

- The player completes a level by reaching the exit.
- The game is completed after finishing all levels.
- The game ends if:
    - HP reaches 0, or
    - Time runs out on any level.

---

**Course:** Graphics and Visual Computing  
**Institution:** University of Caloocan City  
**Program:** Bachelor of Science in Computer Science  
**Developer:** Angelo Mark Jr. S. Flores  
**Adviser:** Prof. Edrick Mendoza Estorel  
**Year:** 2026
