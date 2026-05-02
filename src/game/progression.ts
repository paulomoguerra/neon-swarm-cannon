/**
 * progression.ts — persistent storage and upgrade/economy helpers.
 *
 * All functions are pure wrappers around localStorage with no Phaser dependencies.
 * UpgradeState type is imported from ./types.
 * Tuning constants are imported from ./config.
 */

import type { UpgradeState } from "./types";
import {
  BASE_FIRE_INTERVAL,
  BASE_STARTING_LIVES,
  UPGRADE_FIRE_REDUCTION,
  UPGRADE_LIVES_BONUS,
} from "./config";

// --- Best score ---

export function loadBestScore(): number {
  try { return parseInt(localStorage.getItem("mobCannon_bestScore") || "0", 10) || 0; } catch { return 0; }
}

export function loadBestDistance(): number {
  try { return parseInt(localStorage.getItem("mobCannon_bestDistance") || "0", 10) || 0; } catch { return 0; }
}

export function saveBestScore(v: number): void {
  try { localStorage.setItem("mobCannon_bestScore", String(v)); } catch { /* noop */ }
}

export function saveBestDistance(v: number): void {
  try { localStorage.setItem("mobCannon_bestDistance", String(v)); } catch { /* noop */ }
}

export function updateBestScore(score: number, distance: number): void {
  const cur = loadBestScore();
  const curd = loadBestDistance();
  if (score > cur) saveBestScore(score);
  if (distance > curd) saveBestDistance(distance);
}

// --- Coins / upgrades ---

export function loadTotalCoins(): number {
  try { return parseInt(localStorage.getItem("mobCannon_totalCoins") || "0", 10) || 0; } catch { return 0; }
}

export function saveTotalCoins(v: number): void {
  try { localStorage.setItem("mobCannon_totalCoins", String(v)); } catch { /* noop */ }
}

export function loadUpgradeState(): UpgradeState {
  try {
    const raw = localStorage.getItem("mobCannon_upgrades");
    if (raw) return JSON.parse(raw) as UpgradeState;
  } catch { /* noop */ }
  return { fireLevel: 0, livesLevel: 0 };
}

export function saveUpgradeState(s: UpgradeState): void {
  try { localStorage.setItem("mobCannon_upgrades", JSON.stringify(s)); } catch { /* noop */ }
}

// --- Derived upgrade math ---

export function effectiveFireInterval(upgrades: UpgradeState): number {
  return Math.max(0.10, BASE_FIRE_INTERVAL - upgrades.fireLevel * UPGRADE_FIRE_REDUCTION);
}

export function startingLivesFromUpgrades(upgrades: UpgradeState): number {
  return BASE_STARTING_LIVES + upgrades.livesLevel * UPGRADE_LIVES_BONUS;
}
