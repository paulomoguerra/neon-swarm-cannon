/**
 * Type declarations for the debug/test hooks injected by GameScene.
 * These are attached to `window` at runtime via publishTestHooks().
 *
 * NOTE: These types are authoritative for the public debug API surface.
 * Any change to the actual hook signatures in main.ts must be reflected here.
 */

import type { Mode, UpgradeState, WeaponKind, WeaponSessionState } from "./types";

export type ShopResult = {
  totalCoins: number;
  upgrades: UpgradeState;
  mode: Mode;
};

export type WeaponShopAction = "equip" | "upgrade";

export type WeaponShopResult = {
  mode: Mode;
  weapons: WeaponSessionState;
};

export interface GameDebugHooks {
  /**
   * Returns a JSON string snapshot of the current game state.
   * Useful for automated testing and debugging.
   */
  render_game_to_text: () => string;

  /**
   * Advances the Phaser game simulation by `ms` milliseconds deterministically.
   * Implementation: calls stepGame(1/60) N times, where N = ms / (1000/60).
   */
  advanceTime: (ms: number) => void;

  /**
   * Triggers a shop purchase (fire or lives upgrade) from the menu.
   * Only valid while mode === "menu". Returns null if called in another mode.
   */
  debug_shop_action: (type: "fire" | "lives") => ShopResult | null;

  /**
   * Deterministic session arsenal helper for smoke tests.
   * "upgrade" unlocks a locked weapon or levels an unlocked weapon when Tech allows.
   * "equip" equips an already-unlocked weapon.
   */
  debug_weapon_shop_action: (weapon: WeaponKind, action: WeaponShopAction) => WeaponShopResult | null;

  /** Grants in-memory Tech for deterministic shop tests. */
  debug_grant_session_tech: (amount: number) => WeaponSessionState;

  /**
   * Sets the cannon's horizontal movement target to `x` and advances time by `ms`.
   * The cannon will smoothly move toward the clamped `x` within CANNON_MIN_X/MAX_X.
   * Used by smoke tests to verify touch/drag movement invariant.
   */
  debug_move_cannon_to_x: (x: number, ms: number) => void;

  /**
   * Forces the game into gameover state deterministically.
   * - If mode === "playing": calls endGame() directly (same path as natural gameover).
   * - If mode !== "playing" (menu/victory): starts a run first, waits, then forces gameover.
   * Returns a render_game_to_text()-style snapshot after the transition.
   */
  debug_force_gameover: () => string;
}

declare global {
  interface Window {
    render_game_to_text: GameDebugHooks["render_game_to_text"];
    advanceTime: GameDebugHooks["advanceTime"];
    debug_shop_action: GameDebugHooks["debug_shop_action"];
    debug_weapon_shop_action: GameDebugHooks["debug_weapon_shop_action"];
    debug_grant_session_tech: GameDebugHooks["debug_grant_session_tech"];
    debug_move_cannon_to_x: GameDebugHooks["debug_move_cannon_to_x"];
    debug_force_gameover: GameDebugHooks["debug_force_gameover"];
  }
}
