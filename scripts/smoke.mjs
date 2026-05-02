/**
 * Smoke test for Mob Cannon.
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
  assert(title === "Mob Cannon", `Expected title "Mob Cannon", got "${title}"`);
  console.log("  [PASS] document.title === 'Mob Cannon'");
}

async function testDebugHooksExist(page) {
  await page.waitForFunction(() => {
    return (
      typeof window.render_game_to_text === "function" &&
      typeof window.advanceTime === "function" &&
      typeof window.debug_shop_action === "function"
    );
  }, { timeout: 10_000 });
  console.log("  [PASS] debug hooks exist: render_game_to_text, advanceTime, debug_shop_action");
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
    "checkpointsDestroyed", "cannonLives", "coins", "totalCoins", "upgrades", "powerups",
  ]) {
    assert(
      stateAfterAdvance[field] !== undefined,
      `Expected field '${field}' in game state`
    );
  }

  console.log(`  [PASS] run + advance 45s: mode=${stateAfterAdvance.mode}, score=${stateAfterAdvance.score}, dist=${stateAfterAdvance.distanceMeters}m`);

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

// --- Main ---

async function main() {
  console.log("\n=== Mob Cannon Smoke Tests ===\n");

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
        console.log("[TEST] Start run + time advance");
        await testStartRunAndAdvance(page);
        passed++;
      } catch (e) {
        failed++;
        errors.push({ test: "Start run + time advance", error: e.message });
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
