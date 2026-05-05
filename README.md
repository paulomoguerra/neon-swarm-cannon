# Neon Swarm Cannon

Portrait-first arcade survival game built with Phaser 3, TypeScript, and Vite.

You control a futuristic hover cannon that fires cyan energy projectiles through multiplier gates, breaks barriers, destroys enemy bases, and survives descending red mobs. Runs are endless, with checkpoints, coins, persistent upgrades, powerups, and mobile/desktop controls.

## Run Locally

```bash
npm install
npm run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173/`.

## Checks

```bash
npm run build
npm run smoke
```

The smoke suite uses Playwright and verifies core gameplay hooks, upgrades, restart/game-over behavior, mobile canvas fit, tap, drag, and the forward-only cannon invariant.
