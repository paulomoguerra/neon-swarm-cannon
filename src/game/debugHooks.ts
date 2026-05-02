/**
 * Type declarations for the debug/test hooks injected by GameScene.
 * These are attached to `window` at runtime via publishTestHooks().
 *
 * NOTE: These types are authoritative for the public debug API surface.
 * Any change to the actual hook signatures in main.ts must be reflected here.
 */

import type { Mode, UpgradeState } from "./types";

export type ShopResult = {
  totalCoins: number;
  upgrades: UpgradeState;
  mode: Mode;
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
   * Sets the cannon's horizontal movement target to `x` and advances time by `ms`.
   * The cannon will smoothly move toward the clamped `x` within CANNON_MIN_X/MAX_X.
   * Used by smoke tests to verify touch/drag movement invariant.
   */
  debug_move_cannon_to_x: (x: number, ms: number) => void;
}

declare global {
  interface Window {
    render_game_to_text: GameDebugHooks["render_game_to_text"];
    advanceTime: GameDebugHooks["advanceTime"];
    debug_shop_action: GameDebugHooks["debug_shop_action"];
    debug_move_cannon_to_x: GameDebugHooks["debug_move_cannon_to_x"];
  }
}
