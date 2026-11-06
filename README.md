# Water Quest

Water Quest is a small, original side-scrolling platform game. Guide a village water carrier across grassy paths and raised platforms, collect yellow water cans, and reach the village before time runs out.

The character and artwork are original and use familiar platform-game controls. The can count is only for the game and does not represent money donated or water delivered.

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern web browser.

No build step, server, dependencies, or external assets are required.

## Controls and goal

- Select **Start game** to begin a 60-second run.
- Move with **A/D** or the **left/right arrow keys**. Press the jump key twice in the air for a double jump.
- Hold a direction to build speed gradually, up to a safe top run speed. Build speed before takeoff to carry more momentum and jump farther horizontally.
- Double-tap the same left or right direction quickly to dash in that direction.
- Press **Down** to drop through a raised platform. On touch screens, use the on-screen arrows, double-tap an arrow to dash, tap **JUMP** twice for a double jump, or tap **↓** to drop.
- Each water can collected adds one to both the **Cans Collected** counter and water-gun reserve. Press **F** or tap **SPLASH** to spend one shot and temporarily chase away a critter; both counts decrease together. They show cans currently available, not a lifetime total.
- Falling off the path sends you back to a checkpoint and costs up to two cans/shots.
- Watch for roaming critters across the paths and platforms. The health bar shows your three hearts; each collision takes one heart, with a short safety window between hits. Losing all hearts ends the run.
- Collect cans on the route and reach the village at the far end. Falling into a gap puts you back on the path.
- When you arrive, the village kids cheer and celebrate your delivery.
- Select **Reset** to restart the level.

The game uses a responsive HTML canvas and vanilla JavaScript; no external assets or dependencies are needed.
