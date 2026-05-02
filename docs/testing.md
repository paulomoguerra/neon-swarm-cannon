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
- Debug hooks `render_game_to_text`, `advanceTime`, `debug_shop_action` are present
- Shop upgrades correctly deduct coins and increment upgrade levels
- Starting a run and advancing simulation time produces valid game state
- Game over state is stable (no crash, canvas present, hooks respond)

## Debug Hooks

The game exposes three test hooks on `window`:

| Hook | Signature | Purpose |
|---|---|---|
| `render_game_to_text` | `() => string` | Returns a JSON snapshot of current game state |
| `advanceTime` | `(ms: number) => void` | Advances simulation deterministically by `ms` milliseconds |
| `debug_shop_action` | `(type: "fire" \| "lives") => ShopResult \| null` | Buys an upgrade from the menu and returns the result |

These hooks exist to support automated testing. **Do not remove them.** When changing gameplay code, ensure hooks continue to work correctly.

## Development Rules

### Hardening Patches
- Do NOT add new gameplay features, mechanics, assets, or dependencies
- Preserve all existing debug hooks
- Run `npm run build && npm run smoke` after any gameplay/UI change before committing

### Future Refactor Phases
- `main.ts` extraction into systems is out of scope for hardening patches
- Balance, spawn rates, controls, shop costs, and visuals should not change during hardening

### Module Boundaries (Phase 2+)
| Module | Responsibility |
|---|---|
| `main.ts` | Phaser Scene — input, rendering, orchestration, game loop |
| `game/progression.ts` | localStorage reads/writes, upgrade/economy math |
| `game/runMath.ts` | Pure endless-run formulas (wave, distance, score, red tuning) |
| `game/uiText.ts` | Pure UI text formatting helpers (menu lines, HUD lines) |
| `game/debugSnapshot.ts` | Debug snapshot types and entity serializer helpers |
| `game/art.ts` | Phaser object factory functions |
| `game/world.ts` | Background rendering |
| `game/effects.ts` | Floating text, ring pulse effects |
| `game/debugHooks.ts` | Debug hook exports (`render_game_to_text`, `advanceTime`, `debug_shop_action`) |
| `game/config.ts` | All tuning constants |
| `game/types.ts` | Shared TypeScript types |

### Rule of Thumb
> If a patch touches gameplay logic, smoke tests must pass before handoff.
