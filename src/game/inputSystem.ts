/**
 * inputSystem.ts — Pure input-helper functions with no Phaser Scene ownership.
 *
 * These functions encapsulate deterministic hit-testing and clamp math.
 * The Phaser Scene remains the source of truth for Phaser objects.
 *
 * No side effects, no imports from main.ts.
 */

import { CANNON_MIN_X, CANNON_MAX_X, KEYBOARD_CANNON_SPEED, UPGRADE_BW, UPGRADE_BH, UPGRADE_FIRE_BY, UPGRADE_LIVES_BY, GAME_WIDTH } from "./config";

// ---------------------------------------------------------------------------
// Upgrade button hit-test (menu only)
// ---------------------------------------------------------------------------

export interface UpgradeButtonBounds {
  bx: number;
  bw: number;
  bh: number;
  fireBy: number;
  livesBy: number;
}

/** Returns which upgrade button was hit, or null if no button was hit. */
export function hitTestUpgradeButton(
  px: number,
  py: number,
  bounds: UpgradeButtonBounds
): "fire" | "lives" | null {
  const { bx, bw, bh, fireBy, livesBy } = bounds;
  if (px >= bx && px <= bx + bw && py >= fireBy && py <= fireBy + bh) return "fire";
  if (px >= bx && px <= bx + bw && py >= livesBy && py <= livesBy + bh) return "lives";
  return null;
}

// ---------------------------------------------------------------------------
// Pointer hit-test for menu (upgrade buttons vs start-area)
// ---------------------------------------------------------------------------

export type MenuPointerResult = "fire" | "lives" | "start";

/**
 * Determines what a pointer-down on the menu resolves to.
 * Returns which upgrade button was hit, or "start" if the tap was elsewhere.
 */
export function resolveMenuPointer(
  px: number,
  py: number,
  bounds: UpgradeButtonBounds
): MenuPointerResult {
  const hit = hitTestUpgradeButton(px, py, bounds);
  if (hit) return hit;
  return "start";
}

// ---------------------------------------------------------------------------
// Cannon movement helpers
// ---------------------------------------------------------------------------

/**
 * Clamps `targetX` to the valid cannon movement range.
 * Returns the clamped value without touching any Phaser object.
 */
export function clampCannonX(targetX: number): number {
  if (targetX < CANNON_MIN_X) return CANNON_MIN_X;
  if (targetX > CANNON_MAX_X) return CANNON_MAX_X;
  return targetX;
}

// ---------------------------------------------------------------------------
// Keyboard movement step (pixel delta per dt)
// ---------------------------------------------------------------------------

/**
 * Returns the next raw cannon X position given keyboard input state.
 * Returns the clamped target X (not the lerp result) — the lerp is done by
 * the Scene since it depends on Phaser body access.
 */
export function stepKeyboardCannon(
  currentX: number,
  keyLeft: boolean,
  keyRight: boolean,
  dt: number
): number {
  const dx = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
  if (dx === 0) return currentX;
  const raw = currentX + dx * KEYBOARD_CANNON_SPEED * dt;
  return clampCannonX(raw);
}

// ---------------------------------------------------------------------------
// Standardized upgrade-button bounds (matches GameScene static constants)
// ---------------------------------------------------------------------------

export const MENU_UPGRADE_BOUNDS: UpgradeButtonBounds = {
  bx: GAME_WIDTH / 2 - UPGRADE_BW / 2,
  bw: UPGRADE_BW,
  bh: UPGRADE_BH,
  fireBy: UPGRADE_FIRE_BY,
  livesBy: UPGRADE_LIVES_BY,
};
