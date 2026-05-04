# Mob Cannon — Technical Hardening

## Build

```bash
npm run build
```

Compiles TypeScript and bundles the game into `dist/`.

## Smoke Tests

```bash
npm run smoke
```

Runs automated Playwright smoke tests against a local Vite dev server (port 5173). Verifies:

- Browser title is "Mob Cannon"
- Debug hooks `render_game_to_text`, `advanceTime`, `debug_shop_action`, `debug_move_cannon_to_x`, `debug_force_gameover` are present
- Shop upgrades correctly deduct coins and increment upgrade levels
- Shop purchase with insufficient coins is a no-op (coins/levels unchanged); exact-coin purchase succeeds; zero-coin purchase fails safely (idempotent)
- Shop purchase at max upgrade level is a no-op (coins and levels unchanged)
- Starting a run and advancing simulation time produces valid game state
- Cannon forward-only invariant is maintained (angle = -90 degrees, horizontal movement works)
- Cannon movement via `debug_move_cannon_to_x` hook works correctly
- Game over state is stable (no crash, canvas present, hooks respond)
- Deterministic gameover/restart via `debug_force_gameover` hook

**Mobile viewport (3 tests, 393x852 — iPhone 14 Pro):**

- Canvas renders with nonzero dimensions under mobile viewport
- Mobile tap on canvas starts a run (mode transitions to "playing")
- Mobile horizontal drag moves cannon horizontally; cannon angle stays at -90°

## Debug Hooks

The game exposes five test hooks on `window`:

| Hook | Signature | Purpose |
|---|---|---|
| `render_game_to_text` | `() => string` | Returns a JSON snapshot of current game state |
| `advanceTime` | `(ms: number) => void` | Advances simulation deterministically by `ms` milliseconds |
| `debug_shop_action` | `(type: "fire" \| "lives") => ShopResult \| null` | Buys an upgrade from the menu and returns the result |
| `debug_move_cannon_to_x` | `(x: number, ms: number) => void` | Sets cannon target X and advances simulation by `ms` ms; verifies smooth touch/drag movement invariant |
| `debug_force_gameover` | `() => string` | Forces gameover state deterministically (starts a run if in menu); returns snapshot after transition |

These hooks exist to support automated testing. **Do not remove them.** When changing gameplay code, ensure hooks continue to work correctly.

## Development Rules

### Hardening Patches
- Do NOT add new gameplay features, mechanics, assets, or dependencies
- Preserve all existing debug hooks
- Run `npm run build && npm run smoke` after any gameplay/UI change before committing

### Future Refactor Phases
- `main.ts` extraction into systems is out of scope for hardening patches
- Balance, spawn rates, controls, shop costs, and visuals should not change during hardening

### Module Boundaries
| Module | Responsibility |
|---|---|
| `main.ts` | Phaser Scene — input, rendering, orchestration, game loop |
| `game/inputSystem.ts` | Pure input hit-test helpers, cannon X clamp math, keyboard step math |
| `game/hudSystem.ts` | HUD text update helpers (delegates to uiText.ts) |
| `game/progression.ts` | localStorage reads/writes, upgrade/economy math |
| `game/runMath.ts` | Pure endless-run formulas (wave, distance, score, red tuning) |
| `game/uiText.ts` | Pure UI text formatting helpers (menu lines, HUD lines) |
| `game/debugSnapshot.ts` | Debug snapshot types and entity serializer helpers |
| `game/art.ts` | Phaser object factory functions |
| `game/world.ts` | Background rendering |
| `game/effects.ts` | Floating text, ring pulse effects |
| `game/debugHooks.ts` | Debug hook type declarations (`render_game_to_text`, `advanceTime`, `debug_shop_action`, `debug_move_cannon_to_x`, `debug_force_gameover`) |
| `game/config.ts` | All tuning constants |
| `game/types.ts` | Shared TypeScript types |

### Rule of Thumb
> If a patch touches gameplay logic, smoke tests must pass before handoff.

### Controls

**Cannon**: Forward-only shooting (angle locked to -90° / straight up). No diagonal aiming.

Desktop:
- **Arrow Left / A**: Move cannon left
- **Arrow Right / D**: Move cannon right
- **Space / Enter**: Start run / restart
- **F**: Toggle fullscreen
- **1**: Buy Fire Rate upgrade (menu shortcut)
- **2**: Buy Lives upgrade (menu shortcut)

Mobile:
- **Tap**: Start run / restart / interact with menu
- **Horizontal drag**: Move cannon left/right

This invariant is verified by `npm run smoke` (`testForwardOnlyInvariant`).
