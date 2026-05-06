/**
 * Smoke test for Neon Swarm Cannon.
 * Starts the Vite dev server, runs Playwright checks, then kills the server.
 *
 * Usage: node scripts/smoke.mjs
 *        (or via npm: npm run smoke)
 */

import { chromium } from "playwright";
import { spawn } from "child_process";
import http from "http";

const DEV_URL = "http://127.0.0.1:5173";
const READY_TIMEOUT = 30_000;
const SHUTDOWN_TIMEOUT = 8_000;

// --- Server lifecycle ---

let serverProcess = null;
let serverReady = false;
let serverFailed = false;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    const timeout = setTimeout(() => {
      if (!serverReady) {
        serverFailed = true;
        serverProcess.kill("SIGTERM");
        reject(new Error("Server did not respond within 30s"));
      }
    }, READY_TIMEOUT);

    // Poll HTTP endpoint as the ready signal — Vite emits to stdout, not reliably to stderr
    const pollInterval = setInterval(() => {
      const req = http.get(DEV_URL, (res) => {
        if (!serverReady) {
          serverReady = true;
          clearTimeout(timeout);
          clearInterval(pollInterval);
          resolve();
        }
      });
      req.on("error", () => {
        // Server not ready yet, keep polling
      });
    }, 500);

    serverProcess.on("error", (err) => {
      serverFailed = true;
      clearTimeout(timeout);
      clearInterval(pollInterval);
      reject(err);
    });

    serverProcess.on("exit", (code) => {
      if (!serverReady && !serverFailed) {
        serverFailed = true;
        clearTimeout(timeout);
        clearInterval(pollInterval);
        reject(new Error(`Server exited prematurely with code ${code}`));
      }
    });
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}

// --- Test helpers ---

async function withPage(url, fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
    await fn(page);
    await context.close();
  } finally {
    await browser.close();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

// --- Tests ---

async function testPageTitle(page) {
  const title = await page.title();
  assert(title === "Neon Swarm Cannon", `Expected title "Neon Swarm Cannon", got "${title}"`);
  console.log("  [PASS] document.title === 'Neon Swarm Cannon'");
}

async function testDebugHooksExist(page) {
  await page.waitForFunction(() => {
    return (
      typeof window.render_game_to_text === "function" &&
      typeof window.advanceTime === "function" &&
      typeof window.debug_shop_action === "function" &&
      typeof window.debug_weapon_shop_action === "function" &&
      typeof window.debug_grant_session_tech === "function"
    );
  }, { timeout: 10_000 });
  console.log("  [PASS] debug hooks exist: render_game_to_text, advanceTime, shop + weapon helpers");
}

async function testDefaultWeaponState(page) {
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(state.weapons !== undefined, "snapshot must expose weapons state");
  assert(state.weapons.equippedWeapon === "laser", `Default equipped weapon must be laser, got ${state.weapons.equippedWeapon}`);
  assert(state.weapons.sessionTech === 0, `Session Tech should start at 0, got ${state.weapons.sessionTech}`);
  assert(state.weapons.weapons.laser.unlocked === true, "Laser Bolt must be unlocked by default");
  assert(state.weapons.weapons.spread.unlocked === false, "Spread Pulse should start locked");
  assert(state.weapons.weapons.rail.unlocked === false, "Rail Lance should start locked");
  console.log("  [PASS] default weapon state: Laser Bolt equipped, Tech=0, advanced weapons locked");
}

async function testWeaponShopHelpers(page) {
  await page.evaluate(() => window.debug_grant_session_tech(120));

  const spreadUnlock = await page.evaluate(() => window.debug_weapon_shop_action("spread", "upgrade"));
  assert(spreadUnlock !== null, "debug_weapon_shop_action spread unlock returned null");
  assert(spreadUnlock.weapons.weapons.spread.unlocked === true, "Spread Pulse should unlock");
  assert(spreadUnlock.weapons.equippedWeapon === "spread", "Spread Pulse should equip after unlock");

  const spreadUpgrade = await page.evaluate(() => window.debug_weapon_shop_action("spread", "upgrade"));
  assert(spreadUpgrade.weapons.weapons.spread.level === 2, `Spread Pulse should upgrade to level 2, got ${spreadUpgrade.weapons.weapons.spread.level}`);

  const railUnlock = await page.evaluate(() => window.debug_weapon_shop_action("rail", "upgrade"));
  assert(railUnlock.weapons.weapons.rail.unlocked === true, "Rail Lance should unlock");
  assert(railUnlock.weapons.equippedWeapon === "rail", "Rail Lance should equip after unlock");

  const railUpgrade = await page.evaluate(() => window.debug_weapon_shop_action("rail", "upgrade"));
  assert(railUpgrade.weapons.weapons.rail.level === 2, `Rail Lance should upgrade to level 2, got ${railUpgrade.weapons.weapons.rail.level}`);

  const laserEquip = await page.evaluate(() => window.debug_weapon_shop_action("laser", "equip"));
  assert(laserEquip.weapons.equippedWeapon === "laser", "Laser Bolt should equip via helper");
  console.log("  [PASS] weapon shop helpers unlock/equip/upgrade Spread Pulse and Rail Lance");
}

async function testShopUpgradeFire(page) {
  // Set deterministic state: 200 coins, no upgrades
  await page.evaluate(() => {
    localStorage.setItem("mobCannon_totalCoins", "200");
    localStorage.setItem("mobCannon_upgrades", JSON.stringify({ fireLevel: 0, livesLevel: 0 }));
  });
  await page.reload({ waitUntil: "networkidle" });
  // Wait for Phaser canvas AND for the game to load its state from localStorage
  await page.waitForSelector("canvas", { timeout: 10_000 });
  // Poll render_game_to_text until it shows our pre-set coins (proves game read localStorage)
  await page.waitForFunction(
    () => {
      try {
        const state = JSON.parse(window.render_game_to_text());
        return state.totalCoins === 200;
      } catch {
        return false;
      }
    },
    { timeout: 10_000 }
  );

  // Buy fire upgrade — costs 60 (first entry in UPGRADE_FIRE_COSTS)
  const result = await page.evaluate(() => {
    return window.debug_shop_action("fire");
  });
  assert(result !== null, "debug_shop_action('fire') returned null");
  assert(result.mode === "menu", `Expected mode still 'menu' after fire upgrade, got '${result.mode}'`);
  assert(result.upgrades.fireLevel === 1, `Expected fireLevel 1 after buy, got ${result.upgrades.fireLevel}`);
  assert(result.totalCoins === 140, `Expected totalCoins 140 after fire buy (200-60), got ${result.totalCoins}`);

  console.log("  [PASS] fire upgrade: level=1, coins=140 (200-60)");
}

async function testShopUpgradeLives(page) {
  // State already set to 140 coins and fireLevel=1 from previous test
  // Buy lives upgrade — costs 40 (first entry in UPGRADE_LIVES_COSTS)
  const result = await page.evaluate(() => {
    return window.debug_shop_action("lives");
  });
  assert(result !== null, "debug_shop_action('lives') returned null");
  assert(result.upgrades.livesLevel === 1, `Expected livesLevel 1 after buy, got ${result.upgrades.livesLevel}`);
  assert(result.totalCoins === 100, `Expected totalCoins 100 after lives buy (140-40), got ${result.totalCoins}`);

  console.log("  [PASS] lives upgrade: level=1, coins=100 (140-40)");
}

async function testShopInsufficientCoins(page) {
  // After previous tests: coins=100, fireLevel=1, livesLevel=1
  // Fire upgrade at level 1 costs 140 — can't afford
  const result1 = await page.evaluate(() => {
    return window.debug_shop_action("fire");
  });
  assert(result1 !== null, "debug_shop_action('fire') returned null");
  assert(
    result1.totalCoins === 100,
    `Coins must stay 100 when can't afford fire upgrade, got ${result1.totalCoins}`
  );
  assert(
    result1.upgrades.fireLevel === 1,
    `fireLevel must stay 1 when can't afford, got ${result1.upgrades.fireLevel}`
  );
  // Lives upgrade at level 1 costs 100 — exactly affordably, should succeed
  const result2 = await page.evaluate(() => {
    return window.debug_shop_action("lives");
  });
  assert(result2 !== null, "debug_shop_action('lives') returned null");
  assert(
    result2.upgrades.livesLevel === 2,
    `livesLevel must be 2 after buying with exact coins, got ${result2.upgrades.livesLevel}`
  );
  assert(
    result2.totalCoins === 0,
    `Coins must be 0 after exact purchase, got ${result2.totalCoins}`
  );
  // Trying again with 0 coins should be a no-op
  const result3 = await page.evaluate(() => {
    return window.debug_shop_action("lives");
  });
  assert(result3 !== null, "debug_shop_action('lives') returned null");
  assert(
    result3.totalCoins === 0,
    `Coins must stay 0 after failed purchase attempt, got ${result3.totalCoins}`
  );
  assert(
    result3.upgrades.livesLevel === 2,
    `livesLevel must stay 2 after failed purchase, got ${result3.upgrades.livesLevel}`
  );
  console.log("  [PASS] insufficient-coins purchase is idempotent: coins/lvls unchanged, exact-buy succeeds, zero-coin fails safely");
}

async function testMaxUpgradeIdempotency(page) {
  // Seed localStorage with both upgrades at max level (3) and 999 coins
  await page.evaluate(() => {
    localStorage.setItem("mobCannon_totalCoins", "999");
    localStorage.setItem("mobCannon_upgrades", JSON.stringify({ fireLevel: 3, livesLevel: 3 }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 10_000 });
  // Wait for game to read localStorage state (both upgrades at max)
  await page.waitForFunction(
    () => {
      try {
        const state = JSON.parse(window.render_game_to_text());
        return state.upgrades.fireLevel === 3 && state.upgrades.livesLevel === 3 && state.totalCoins === 999;
      } catch {
        return false;
      }
    },
    { timeout: 10_000 }
  );

  // Trying to buy fire at max level must be a no-op
  const resultFire = await page.evaluate(() => {
    return window.debug_shop_action("fire");
  });
  assert(resultFire !== null, "debug_shop_action('fire') returned null at max level");
  assert(
    resultFire.upgrades.fireLevel === 3,
    `fireLevel must stay 3 at max, got ${resultFire.upgrades.fireLevel}`
  );
  assert(
    resultFire.totalCoins === 999,
    `Coins must stay 999 when fire is maxed, got ${resultFire.totalCoins}`
  );

  // Trying to buy lives at max level must also be a no-op
  const resultLives = await page.evaluate(() => {
    return window.debug_shop_action("lives");
  });
  assert(resultLives !== null, "debug_shop_action('lives') returned null at max level");
  assert(
    resultLives.upgrades.livesLevel === 3,
    `livesLevel must stay 3 at max, got ${resultLives.upgrades.livesLevel}`
  );
  assert(
    resultLives.totalCoins === 999,
    `Coins must stay 999 when lives is maxed, got ${resultLives.totalCoins}`
  );

  console.log("  [PASS] max upgrade idempotency: fire and lives at level 3, coins stay 999, no-op on buy attempts");
}

async function testStartRunAndAdvance(page) {
  // Trigger start (Space key)
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);

  const stateAfterStart = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateAfterStart.mode === "playing", `Expected mode 'playing' after Space, got '${stateAfterStart.mode}'`);

  // Advance 30-60 seconds of simulation
  await page.evaluate(() => window.advanceTime(45_000));
  await page.waitForTimeout(300);

  const stateAfterAdvance = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(
    stateAfterAdvance.mode === "playing" || stateAfterAdvance.mode === "gameover",
    `Expected mode 'playing' or 'gameover', got '${stateAfterAdvance.mode}'`
  );
  assert(
    typeof stateAfterAdvance.score === "number" && stateAfterAdvance.score >= 0,
    `Expected nonnegative score, got ${stateAfterAdvance.score}`
  );
  assert(
    typeof stateAfterAdvance.distanceMeters === "number" && stateAfterAdvance.distanceMeters >= 0,
    `Expected nonnegative distanceMeters, got ${stateAfterAdvance.distanceMeters}`
  );

  // Required fields
  for (const field of [
    "mode", "cannon", "score", "distanceMeters", "wave",
    "checkpointsDestroyed", "cannonLives", "coins", "totalCoins", "upgrades", "weapons", "powerups",
  ]) {
    assert(
      stateAfterAdvance[field] !== undefined,
      `Expected field '${field}' in game state`
    );
  }

  console.log(`  [PASS] run + advance 45s: mode=${stateAfterAdvance.mode}, score=${stateAfterAdvance.score}, dist=${stateAfterAdvance.distanceMeters}m`);

  assert(
    stateAfterAdvance.weapons.sessionTech >= stateAfterAdvance.kills,
    `Session Tech should include at least +1 per kill, got tech=${stateAfterAdvance.weapons.sessionTech}, kills=${stateAfterAdvance.kills}`
  );
  console.log(`  [PASS] session Tech accrues during play: tech=${stateAfterAdvance.weapons.sessionTech}, kills=${stateAfterAdvance.kills}, checkpoints=${stateAfterAdvance.checkpointsDestroyed}`);

  // If gameover, verify no crash and canvas is present
  if (stateAfterAdvance.mode === "gameover") {
    const canvasExists = await page.evaluate(() => !!document.querySelector("canvas"));
    assert(canvasExists, "Canvas element missing after gameover");
    const playAgainVisible = await page.evaluate(() => {
      const state = JSON.parse(window.render_game_to_text());
      return state !== null;
    });
    assert(playAgainVisible, "render_game_to_text still responds after gameover");
    console.log("  [PASS] gameover state: canvas present, hooks still respond");
  }
}

async function testForwardOnlyInvariant(page) {
  // Start a run
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);

  const initial = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(initial.mode === "playing", `Expected mode 'playing', got '${initial.mode}'`);
  assert(initial.cannon !== null, "cannon must not be null during play");

  // Angle must be exactly -90 (forward-only)
  const angle = initial.cannon.angleDegrees;
  assert(angle === -90, `Cannon angle must be -90 (forward-only), got ${angle}`);
  console.log(`  [PASS] cannon angle is ${angle} (forward-only invariant)`);

  // Capture cannon x before movement
  const xBefore = initial.cannon.x;

  // Advance a few frames so cannon.x is set
  await page.evaluate(() => window.advanceTime(500));
  await page.waitForTimeout(100);

  // Press and hold ArrowRight — cannon should move right, angle stays -90
  await page.keyboard.down("ArrowRight");
  await page.evaluate(() => window.advanceTime(800));
  await page.waitForTimeout(100);
  await page.keyboard.up("ArrowRight");

  const stateAfterRight = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(
    stateAfterRight.cannon !== null,
    "cannon must not be null after ArrowRight"
  );
  assert(
    stateAfterRight.cannon.x > xBefore,
    `After ArrowRight: cannon.x should increase (was ${xBefore}, got ${stateAfterRight.cannon.x})`
  );
  assert(
    stateAfterRight.cannon.angleDegrees === -90,
    `After ArrowRight: angle must stay -90, got ${stateAfterRight.cannon.angleDegrees}`
  );
  console.log(`  [PASS] ArrowRight moves cannon right (${xBefore} -> ${stateAfterRight.cannon.x}), angle stays ${stateAfterRight.cannon.angleDegrees}`);

  // Press and hold ArrowLeft — cannon should move left, angle stays -90
  const xBeforeLeft = stateAfterRight.cannon.x;
  await page.keyboard.down("ArrowLeft");
  await page.evaluate(() => window.advanceTime(800));
  await page.waitForTimeout(100);
  await page.keyboard.up("ArrowLeft");

  const stateAfterLeft = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(
    stateAfterLeft.cannon !== null,
    "cannon must not be null after ArrowLeft"
  );
  assert(
    stateAfterLeft.cannon.x < xBeforeLeft,
    `After ArrowLeft: cannon.x should decrease (was ${xBeforeLeft}, got ${stateAfterLeft.cannon.x})`
  );
  assert(
    stateAfterLeft.cannon.angleDegrees === -90,
    `After ArrowLeft: angle must stay -90, got ${stateAfterLeft.cannon.angleDegrees}`
  );
  console.log(`  [PASS] ArrowLeft moves cannon left (${xBeforeLeft} -> ${stateAfterLeft.cannon.x}), angle stays ${stateAfterLeft.cannon.angleDegrees}`);
}

async function testGameoverRestartHook(page) {
  // Start a run via Space
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);

  const stateBefore = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateBefore.mode === "playing", `Expected mode 'playing' after Space, got '${stateBefore.mode}'`);

  // Force gameover deterministically
  const stateAfterGO = JSON.parse(await page.evaluate(() => window.debug_force_gameover()));
  assert(stateAfterGO.mode === "gameover", `Expected mode 'gameover' after debug_force_gameover, got '${stateAfterGO.mode}'`);

  // Snapshot must still be valid JSON after gameover
  const snapshot = await page.evaluate(() => window.render_game_to_text());
  const parsed = JSON.parse(snapshot);
  assert(parsed !== null, "render_game_to_text must return valid JSON after gameover");
  assert(parsed.mode === "gameover", `Snapshot mode must be 'gameover', got '${parsed.mode}'`);

  // Press Space from gameover returns to arsenal/menu first
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);

  const stateAfterMenu = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateAfterMenu.mode === "menu", `Expected mode 'menu' after gameover CTA, got '${stateAfterMenu.mode}'`);

  // Next Space starts the following run from the menu.
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);

  const stateAfterRestart = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateAfterRestart.mode === "playing", `Expected mode 'playing' after menu Space, got '${stateAfterRestart.mode}'`);

  console.log("  [PASS] debug_force_gameover: gameover -> menu/shop -> playing");
}

async function testDebugMoveCannonToX(page) {
  // Start a run
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);

  const initial = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(initial.mode === "playing", `Expected mode 'playing', got '${initial.mode}'`);
  assert(initial.cannon !== null, "cannon must not be null during play");

  const xBefore = initial.cannon.x;

  // Move cannon to a target X to the right
  const targetX = Math.min(xBefore + 80, 405); // CANNON_MAX_X = 405
  await page.evaluate(
    (tx) => window.debug_move_cannon_to_x(tx, 300),
    targetX
  );
  await page.waitForTimeout(100);

  const stateAfter = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateAfter.cannon !== null, "cannon must not be null after debug_move_cannon_to_x");
  assert(
    stateAfter.cannon.x > xBefore,
    `After move right: cannon.x should increase (was ${xBefore}, got ${stateAfter.cannon.x})`
  );
  assert(
    stateAfter.cannon.x >= targetX - 2 && stateAfter.cannon.x <= targetX + 2,
    `Cannon.x should be near target ${targetX}, got ${stateAfter.cannon.x}`
  );
  assert(
    stateAfter.cannon.angleDegrees === -90,
    `After debug_move_cannon_to_x: angle must stay -90, got ${stateAfter.cannon.angleDegrees}`
  );
  console.log(`  [PASS] debug_move_cannon_to_x moves cannon right (${xBefore} -> ${stateAfter.cannon.x}), angle stays ${stateAfter.cannon.angleDegrees}`);

  // Move back to the left using debug_move_cannon_to_x
  const leftTarget = Math.max(xBefore, 135); // CANNON_MIN_X = 135
  await page.evaluate(
    (tx) => window.debug_move_cannon_to_x(tx, 300),
    leftTarget
  );
  await page.waitForTimeout(100);

  const stateLeft = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateLeft.cannon !== null, "cannon must not be null after left move");
  assert(
    stateLeft.cannon.x <= xBefore + 1,
    `After move left: cannon.x should be <= original (was ${xBefore}, got ${stateLeft.cannon.x})`
  );
  assert(
    stateLeft.cannon.angleDegrees === -90,
    `After left debug_move: angle must stay -90, got ${stateLeft.cannon.angleDegrees}`
  );
  console.log(`  [PASS] debug_move_cannon_to_x moves cannon left (back to ~${stateLeft.cannon.x}), angle stays ${stateLeft.cannon.angleDegrees}`);
}

// --- Mobile viewport smoke ---

async function withMobilePage(url, fn) {
  // iPhone 14 Pro dimensions — representative mobile viewport
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
    await fn(page);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function testMobileCanvasVisible(page) {
  await page.waitForSelector("canvas", { timeout: 10_000 });
  const canvas = await page.$("canvas");
  assert(canvas !== null, "Canvas element must be present under mobile viewport");
  const box = await canvas.boundingBox();
  assert(box !== null && box.width > 0 && box.height > 0,
    `Canvas must have nonzero dimensions under mobile viewport, got ${JSON.stringify(box)}`);
  // Assert portrait aspect — mobile viewports should show the game taller than wide
  assert(box.height > box.width,
    `Canvas should be portrait (height ${Math.round(box.height)} > width ${Math.round(box.width)})`);
  console.log(`  [PASS] canvas is portrait: ${Math.round(box.width)}x${Math.round(box.height)} (width < height)`);
  // Assert the full game is visible without crop. FIT may leave vertical room on
  // tall phones, but the whole portrait playfield must fit inside the viewport.
  assert(box.width >= 390,
    `Canvas width should use the available mobile width, got ${Math.round(box.width)}`);
  assert(box.height <= 852,
    `Canvas height should fit inside the mobile viewport without crop, got ${Math.round(box.height)}`);
  assert(box.x >= -1 && box.y >= -1,
    `Canvas should not be cropped offscreen, got x=${Math.round(box.x)}, y=${Math.round(box.y)}`);
  console.log(`  [PASS] canvas fits viewport without crop: ${Math.round(box.width)}x${Math.round(box.height)}`);
}

async function testMobileTapStartsRun(page) {
  await page.waitForSelector("canvas", { timeout: 10_000 });
  // Wait for menu to be ready
  await page.waitForTimeout(500);

  // Tap the canvas center — this should start the run (like pressing Space)
  const canvas = await page.$("canvas");
  const box = await canvas.boundingBox();
  assert(box !== null, "canvas must have bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.touchscreen.tap(cx, cy);
  await page.waitForTimeout(600);

  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(state.mode === "playing", `Expected mode 'playing' after mobile tap, got '${state.mode}'`);
  console.log("  [PASS] mobile tap starts run (mode=playing)");
}

async function testMobileDragMovesCannon(page) {
  await page.waitForSelector("canvas", { timeout: 10_000 });
  // Start the run first
  await page.touchscreen.tap(box => {
    const canvas = document.querySelector("canvas");
    const b = canvas.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }).catch(() => {});
  // Fallback: use Space to start
  await page.keyboard.press("Space");
  await page.waitForTimeout(600);

  const stateBefore = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateBefore.mode === "playing", `Must be in playing mode for drag test, got '${stateBefore.mode}'`);
  assert(stateBefore.cannon !== null, "cannon must exist during play");
  const xBefore = stateBefore.cannon.x;

  // Perform a touch drag from center toward the right side of the canvas
  const canvas = await page.$("canvas");
  const box = await canvas.boundingBox();
  const toClientX = (logicalX) => box.x + (logicalX / 540) * box.width;
  const cx = toClientX(stateBefore.cannon.x);
  const cy = box.y + (stateBefore.cannon.y / 960) * box.height;
  const dragLen = 90;
  // Drag right from the cannon's current visual position. Compute client coords
  // from logical game coordinates so the test works at any FIT scale.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dragLen, cy, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const stateAfter = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(stateAfter.cannon !== null, "cannon must still exist after drag");
  assert(
    stateAfter.cannon.x > xBefore,
    `After right drag: cannon.x should increase (was ${xBefore}, got ${stateAfter.cannon.x})`
  );
  assert(
    stateAfter.cannon.angleDegrees === -90,
    `After drag: angle must stay -90, got ${stateAfter.cannon.angleDegrees}`
  );
  console.log(`  [PASS] mobile drag moves cannon horizontally (${xBefore} -> ${stateAfter.cannon.x}), angle stays -90`);

  // Test drag left
  const xBeforeLeft = stateAfter.cannon.x;
  await page.mouse.move(cx + dragLen, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const stateLeft = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert(
    stateLeft.cannon.x < xBeforeLeft,
    `After left drag: cannon.x should decrease (was ${xBeforeLeft}, got ${stateLeft.cannon.x})`
  );
  assert(
    stateLeft.cannon.angleDegrees === -90,
    `After left drag: angle must stay -90, got ${stateLeft.cannon.angleDegrees}`
  );
  console.log(`  [PASS] mobile left drag moves cannon (${xBeforeLeft} -> ${stateLeft.cannon.x}), angle stays -90`);
}

// --- Main ---

async function main() {
  console.log("\n=== Neon Swarm Cannon Smoke Tests ===\n");

  let passed = 0;
  let failed = 0;
  const errors = [];

  try {
    // 1. Start server
    console.log("[STEP] Starting Vite dev server...");
    await startServer();
    console.log("[STEP] Server ready.\n");

    // 2. Run tests
    await withPage(DEV_URL, async (page) => {
      try {
        console.log("[TEST] Page title");
        await testPageTitle(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Page title", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Debug hooks exist");
        await testDebugHooksExist(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Debug hooks exist", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Default weapon state");
        await testDefaultWeaponState(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Default weapon state", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Shop upgrade — fire");
        await testShopUpgradeFire(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Shop upgrade — fire", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Shop upgrade — lives");
        await testShopUpgradeLives(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Shop upgrade — lives", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Shop — insufficient coins / idempotency");
        await testShopInsufficientCoins(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Shop — insufficient coins / idempotency", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Max upgrade — idempotency at level cap");
        await testMaxUpgradeIdempotency(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Max upgrade — idempotency at level cap", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Session Arsenal helpers");
        await testWeaponShopHelpers(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Session Arsenal helpers", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Start run + time advance");
        await testStartRunAndAdvance(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Start run + time advance", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Forward-only invariant + keyboard movement");
        await testForwardOnlyInvariant(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Forward-only invariant + keyboard movement", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] debug_move_cannon_to_x hook");
        await testDebugMoveCannonToX(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "debug_move_cannon_to_x hook", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] debug_force_gameover hook");
        await testGameoverRestartHook(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "debug_force_gameover hook", error: e.message });
        throw e;
      }

      // --- Mobile viewport smoke (separate context, same server) ---
      try {
        console.log("[TEST] Mobile — canvas visible at 393x852 viewport");
        await withMobilePage(DEV_URL, testMobileCanvasVisible);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Mobile — canvas visible", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Mobile — tap starts run");
        await withMobilePage(DEV_URL, testMobileTapStartsRun);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Mobile — tap starts run", error: e.message });
        throw e;
      }

      try {
        console.log("[TEST] Mobile — drag moves cannon, angle stays -90");
        await withMobilePage(DEV_URL, testMobileDragMovesCannon);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Mobile — drag moves cannon", error: e.message });
        throw e;
      }
    });
  } catch (e) {
    // Errors from withPage tests already recorded
    if (errors.length === 0) {
      errors.push({ test: "Server startup", error: e.message });
    }
  } finally {
    console.log("\n[STEP] Stopping dev server...");
    stopServer();
    // Give the process a moment to terminate cleanly
    await new Promise((r) => setTimeout(r, 500));
  }

  // --- Summary ---
  console.log("\n=== Summary ===");
  console.log(`PASS: ${passed} / ${passed + failed}`);
  if (failed > 0) {
    console.log(`FAIL: ${failed}`);
    for (const { test, error } of errors) {
      console.log(`  - ${test}: ${error}`);
    }
    process.exit(1);
  } else {
    console.log("PASS — All smoke tests passed.\n");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  stopServer();
  process.exit(1);
});
