/**
 * uiText.ts — Pure UI text formatting helpers with no Phaser dependencies.
 *
 * All functions are deterministic string formatters used by main.ts for
 * menu and HUD rendering. No side effects, no Phaser imports.
 */

import { UPGRADE_FIRE_COSTS, UPGRADE_LIVES_COSTS, UPGRADE_MAX_LEVEL } from "./config";

// ---------------------------------------------------------------------------
// Menu formatting
// ---------------------------------------------------------------------------

/**
 * Returns the best-score line shown on the menu, or empty string when both
 * values are zero or negative.
 */
export function formatBestLine(bestScore: number, bestDistance: number): string {
  if (bestScore <= 0 && bestDistance <= 0) return "";
  return `Best Score: ${bestScore}   Best Dist: ${bestDistance}m`;
}

/** Returns the coins line shown on the menu. */
export function formatCoinsLine(totalCoins: number): string {
  return `Coins: ${totalCoins}`;
}

/**
 * Returns the fire-rate upgrade line for the menu.
 * Touch-first: `Tap Fire Rate Lv{N}  (C coins)` or `Tap Fire Rate MAX`
 */
export function formatFireUpgradeLine(fireLevel: number): string {
  if (fireLevel >= UPGRADE_MAX_LEVEL) return "Tap Fire Rate MAX";
  const cost = UPGRADE_FIRE_COSTS[fireLevel];
  return `Tap Fire Rate Lv${fireLevel + 1}  (${cost} coins)`;
}

/**
 * Returns the lives upgrade line for the menu.
 * Touch-first: `Tap Lives Lv{N}  (C coins)` or `Tap Lives MAX`
 */
export function formatLivesUpgradeLine(livesLevel: number): string {
  if (livesLevel >= UPGRADE_MAX_LEVEL) return "Tap Lives MAX";
  const cost = UPGRADE_LIVES_COSTS[livesLevel];
  return `Tap Lives Lv${livesLevel + 1}  (${cost} coins)`;
}

// ---------------------------------------------------------------------------
// HUD formatting
// ---------------------------------------------------------------------------

/** Left HUD: score and distance stacked. */
export function formatHudLeft(score: number, distanceMeters: number): string {
  return `Score: ${score}\nDist: ${Math.floor(distanceMeters)}m`;
}

/** Center HUD: wave and checkpoints destroyed. */
export function formatHudCenter(wave: number, checkpointsDestroyed: number): string {
  return `Wave ${wave}   CP ${checkpointsDestroyed}`;
}

/** Right HUD: red mob count and base HP.
 * baseHp is null when the base is not present, otherwise an object with hp and maxHp.
 */
export function formatHudRight(redCount: number, baseHp: { hp: number; maxHp: number } | null): string {
  return `Red: ${redCount}\nBase ${baseHp !== null ? `${baseHp.hp}/${baseHp.maxHp}` : "—"}`;
}

/**
 * Lives line: labelled hearts. Returns empty string when lives is 0.
 * Format: `Lives: N ♥♥♥` or `Lives: 0`
 */
export function formatLivesLine(cannonLives: number): string {
  if (cannonLives <= 0) return "Lives: 0";
  const hearts: string = "\u2665".repeat(cannonLives);
  return `Lives: ${cannonLives} ${hearts}`;
}

/**
 * Power-up status line. Returns compact `SH:Xs  RF:Xs` format or empty.
 * Timers are rounded via toFixed(0) before display.
 */
export function formatPowerupStatus(shieldTimer: number, rapidTimer: number): string {
  const parts: string[] = [];
  if (shieldTimer > 0) parts.push(`SH:${shieldTimer.toFixed(0)}s`);
  if (rapidTimer > 0) parts.push(`RF:${rapidTimer.toFixed(0)}s`);
  return parts.join("  ");
}
