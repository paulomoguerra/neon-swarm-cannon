/**
 * uiText.ts — Pure UI text formatting helpers with no Phaser dependencies.
 *
 * All functions are deterministic string formatters used by main.ts for
 * menu and HUD rendering. No side effects, no Phaser imports.
 */

import { UPGRADE_FIRE_COSTS, UPGRADE_LIVES_COSTS, UPGRADE_MAX_LEVEL, WEAPON_CONFIG, WEAPON_MAX_LEVEL } from "./config";
import type { ReactorCore, WeaponKind, WeaponSessionState } from "./types";

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

export function formatTechLine(sessionTech: number): string {
  return `SESSION ARSENAL   Tech: ${sessionTech}`;
}

/**
 * Returns the fire-rate upgrade line for the menu.
 * Touch-first: labels whether the upgrade can be bought now or needs coins.
 */
export function formatFireUpgradeLine(fireLevel: number, totalCoins = 0): string {
  if (fireLevel >= UPGRADE_MAX_LEVEL) return "Fire Rate MAX";
  const cost = UPGRADE_FIRE_COSTS[fireLevel];
  const action = totalCoins >= cost ? `Buy for ${cost}` : `Need ${cost}`;
  return `Fire Rate Lv${fireLevel + 1}\n${action} coins`;
}

/**
 * Returns the lives upgrade line for the menu.
 * Touch-first: labels whether the upgrade can be bought now or needs coins.
 */
export function formatLivesUpgradeLine(livesLevel: number, totalCoins = 0): string {
  if (livesLevel >= UPGRADE_MAX_LEVEL) return "Lives MAX";
  const cost = UPGRADE_LIVES_COSTS[livesLevel];
  const action = totalCoins >= cost ? `Buy for ${cost}` : `Need ${cost}`;
  return `Lives Lv${livesLevel + 1}\n${action} coins`;
}

export function formatWeaponShopLine(kind: WeaponKind, session: WeaponSessionState): string {
  const cfg = WEAPON_CONFIG[kind];
  const state = session.weapons[kind];
  if (!state.unlocked) {
    return `${cfg.label}\nLOCKED\nUNLOCK ${cfg.unlockCost}T`;
  }
  if (session.equippedWeapon !== kind) {
    return `${cfg.label}\nLV${state.level} READY\nEQUIP`;
  }
  if (state.level >= WEAPON_MAX_LEVEL) {
    return `${cfg.label}\nLV${state.level} EQUIPPED\nMAX LEVEL`;
  }
  const cost = cfg.upgradeCosts[state.level - 1];
  return `${cfg.label}\nLV${state.level} EQUIPPED\nUPGRADE ${cost}T`;
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
  return `Wave ${wave}\nCP ${checkpointsDestroyed}`;
}

export function formatHudRight(redCount: number, reactors: Array<Pick<ReactorCore, "side" | "hp" | "maxHp" | "destroyed">>): string {
  const reactorLine = reactors.map((reactor) => {
    const label = reactor.side === "left" ? "L" : "R";
    return reactor.destroyed ? `${label} DOWN` : `${label} ${reactor.hp}/${reactor.maxHp}`;
  }).join("  ");
  return `Red: ${redCount}\n${reactorLine || "Reactors —"}`;
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
  if (shieldTimer > 0) parts.push(`Shield ${shieldTimer.toFixed(0)}s`);
  if (rapidTimer > 0) parts.push(`Rapid ${rapidTimer.toFixed(0)}s`);
  return parts.join("  ");
}

export function formatWeaponHudLine(kind: WeaponKind, level: number): string {
  return `${WEAPON_CONFIG[kind].label} Lv${level}`;
}
