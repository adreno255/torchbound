# Torchbound

A 2D pixel-style top-down maze adventure browser-based game built with p5.js.

## Game Overview

Torchbound is a challenging maze adventure where players must escape dark, trap-filled environments using only a torch to see their surroundings. The maze is shrouded in darkness, with only the area illuminated by the player's torch visible, creating a fog-of-war effect that forces players to rely on memory, exploration, and careful movement.

The game takes place in a mysterious and dangerous dungeon. Each level presents a new maze layout, more dangerous traps, and tighter time limits. Players must balance exploration, speed, and survival to achieve the highest possible score.

## Game Objective

The main objective is to reach the exit of each maze while maintaining as much health and time as possible.

Players are encouraged to:

- Finish levels quickly
- Avoid taking damage
- Collect helpful items

Higher performance results in higher scores, which are recorded in a leaderboard system.

## Gameplay Mechanics

### Player Movement

- Move using keyboard controls (WASD or arrow keys)
- Movement is limited to four directions
- Cannot pass through walls

### Fog of War / Torch System

- The maze is hidden in darkness
- Only a circular area around the player is visible
- Light radius represents torch range and can be increased with power-ups

### Maze and Levels

- The game consists of up to 5 levels
- Each level features:
    - A unique maze layout
    - An entrance and an exit
    - Strategically placed traps
- Difficulty increases with each level through:
    - More complex paths
    - More traps
    - Shorter time limits

### Health System

- Player starts with 100% HP
- Traps deal varying damage:
    - Minor trap: −10% HP
    - Medium trap: −25% HP
    - Heavy trap: −40% HP
- Game ends if HP reaches 0%
- Allows for mistakes but punishes reckless movement

### Timer System

- Each level has a countdown timer
- Level is lost if time runs out
- Extra time can be gained through power-ups

### Power-Ups

Items scattered throughout the maze that help the player:

- **Light Boost** – Increases torch radius temporarily
- **Time Crystal** – Adds extra seconds to the timer
- **Shield** – Protects player from damage from the next trap

### Scoring System

Each level awards a performance score based on:

- Remaining HP
- Remaining Time

Higher HP and more remaining time result in a higher score. At the end of each level, the score is added to the total game score.

### Leaderboard System

- Total score is stored after completing all levels
- Highest scores are saved locally using browser's local storage
- Players can view a leaderboard showing the best runs
- Encourages replayability and competition

## Winning and Losing

**Winning:**

- Complete a level by reaching the exit
- Complete the game by finishing all 5 levels

**Losing:**
The game ends if:

- HP reaches 0%, or
- Time runs out on any level

---

**Course:** Graphics and Visual Computing  
**Institution:** University of Caloocan City  
**Program:** Bachelor of Science in Computer Science  
**Developer:** Angelo Mark Jr. S. Flores  
**Adviser:** Prof. Edrick Mendoza Estorel  
**Year:** 2026
