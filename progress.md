Original prompt: Create an endless zombie evacuation auto-shooter like Jetpack Joyride, focused on the shooting runner loop without village/resource management.

## Progress

- Created a Vite + TypeScript + Phaser 3 project scaffold.
- Implemented the first playable loop in `src/main.ts`: menu, three-lane movement, endless scrolling road, automatic squad shooting, zombies, survivors, obstacles, temporary weapon pickup, shield pickup, squad-size-as-health, score, game over, restart, fullscreen key, and test hooks.
- Installed dependencies and fixed an initial Phaser cleanup-helper typing issue found by TypeScript.
- Browser state hook and direct screenshot confirmed gameplay was running; switched Phaser from WebGL auto mode to Canvas mode because the official Playwright canvas capture read the WebGL buffer as black.
- `npm run build` passes.
- Playwright smoke test passed with visible gameplay in `output/web-game/shot-0.png`; `output/web-game/state-0.json` showed active play, distance progression, kills, an obstacle, and a survivor.
- Required repo checks: no `tests/` directory exists for `python3 -m pytest tests/`; `npx pyright .` completed with 0 errors.
- Full targeted browser test passed on 2026-04-28. Verified: menu start, restart, keyboard lane movement, lane boundary clamp, auto-fire kills, survivor rescue increasing squad size, pickup activation, hazard damage reducing squad size, game-over at zero squad members, and restart from game-over. Report: `output/web-game/targeted-pass/report.json`. Screenshots: `output/web-game/targeted-pass/gameover.png` and `output/web-game/targeted-pass/restarted.png`.
- Redesigned the game toward a Top-War-ad-style arcade loop after reviewing the App Store reference: bright top-down battlefield, six lanes, visible unit formation, numbered merge tiers, recruit tokens, boost/shield pickups, auto-targeting shots, and endless enemy pressure. No base/village/resource-management layer was added.
- Final redesign verification passed. `npm run build` passes. Browser playtest showed survival to 828m, power growth from 5 to 11, 19 merges, 38 kills, no console errors. Report: `output/web-game/topwar-final/report.json`. Screenshot: `output/web-game/topwar-final/gameplay.png`.
- Second visual redesign pass pushed the presentation closer to the Top War reference without copying exact protected artwork: brighter island map, ocean/sky surround, framed playfield, grass tile pattern, base decorations, chunky tank-like player units, clearer enemy silhouettes, styled HUD/action pill, and a favicon to keep browser load clean. `npm run build` passes. Screenshot smoke test: `output/web-game/reference-redesign-final/shot-0.png`.
- Iteration/refactor pass: extracted config/tuning, shared entity types, art factories, world drawing, and transient effects into `src/game/`. Added merge/recruit/pickup/hit feedback, fixed HUD draw depth, removed duplicate BOOST text from the HUD, and changed damage so higher-tier units downgrade before disappearing. This keeps merging valuable instead of reducing survivability.
- Final iteration verification: `npm run build` passes; `npx pyright .` reports 0 errors; browser regression passed with start/input/playability/auto-fire/merge/pickup checks and no console errors. Report: `output/web-game/iteration-final/report.json`. Screenshot: `output/web-game/iteration-final/gameplay.png`. There is still no `tests/` directory for the repository-mandated pytest command.
- 2.5D visual iteration: added projection helpers, converging lanes, raised board slab, projected/scaled entities, depth sorting, and a tighter isometric squad wedge. Collision and lane logic remain lane-based for simplicity. Browser regression passed with start/input/playability/auto-fire/merge/pickup checks and no console errors. Report: `output/web-game/2_5d-final/report.json`. Screenshot: `output/web-game/2_5d-final/gameplay.png`.

## TODO

- Continue visual polish: add richer unit animations, clearer merge effects, and more Top-War-like UI panels/buttons while keeping original artwork.
- Consider adding a short vehicle powerup after the basic loop feels good.
