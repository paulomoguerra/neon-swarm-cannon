/**
 * hudSystem.ts — HUD update helpers.
 *
 * Encapsulates all HUD text object updates for playing and menu states.
 * Delegates text formatting to uiText.ts (pure, no side effects).
 * No Phaser imports — works with Phaser.GameObjects.Text instances.
 *
 * Usage:
 *   import { updatePlayingHud, updateMenuHud } from "./game/hudSystem";
 */

import type * as PhaserType from "phaser";
import {
  formatHudLeft,
  formatHudCenter,
  formatHudRight,
  formatLivesLine,
  formatPowerupStatus,
  formatBestLine,
  formatCoinsLine,
  formatFireUpgradeLine,
  formatLivesUpgradeLine,
} from "./uiText";
import { loadBestScore, loadBestDistance, loadTotalCoins, loadUpgradeState } from "./progression";
import type { ReactorCore } from "./types";

// ---------------------------------------------------------------------------
// Playing-state HUD — refs and state interfaces
// ---------------------------------------------------------------------------

export interface PlayingHudRefs {
  hudLeftText: PhaserType.GameObjects.Text;
  hudCenterText: PhaserType.GameObjects.Text;
  hudRightText: PhaserType.GameObjects.Text;
  livesText: PhaserType.GameObjects.Text;
  powerupStatusText: PhaserType.GameObjects.Text;
  cannonAngleText: PhaserType.GameObjects.Text;
}

export interface PlayingHudState {
  score: number;
  distanceMeters: number;
  wave: number;
  checkpointsDestroyed: number;
  redMobCount: number;
  cannonLives: number;
  shieldTimer: number;
  rapidTimer: number;
  reactors: Array<Pick<ReactorCore, "side" | "hp" | "maxHp" | "destroyed">>;
}

export function updatePlayingHud(refs: PlayingHudRefs, state: PlayingHudState): void {
  refs.hudLeftText.setText(formatHudLeft(state.score, state.distanceMeters));
  refs.hudCenterText.setText(formatHudCenter(state.wave, state.checkpointsDestroyed));
  refs.hudRightText.setText(formatHudRight(state.redMobCount, state.reactors));
  refs.livesText.setText(formatLivesLine(state.cannonLives));
  refs.powerupStatusText.setText(formatPowerupStatus(state.shieldTimer, state.rapidTimer));
  refs.cannonAngleText.setText("");
}

// ---------------------------------------------------------------------------
// Clear playing-state HUD elements
// ---------------------------------------------------------------------------

export function clearPlayingHud(refs: PlayingHudRefs): void {
  refs.hudLeftText.setText("");
  refs.hudCenterText.setText("");
  refs.hudRightText.setText("");
  refs.livesText.setText("");
  refs.cannonAngleText.setText("");
  refs.powerupStatusText.setText("");
}

// ---------------------------------------------------------------------------
// Menu-state HUD
// ---------------------------------------------------------------------------

export interface MenuHudOptions {
  bestScoreTextX?: number;
  bestScoreTextY?: number;
}

export interface MenuHudElements {
  bestScoreText: PhaserType.GameObjects.Text;
  coinsText: PhaserType.GameObjects.Text;
  upgradeFireText: PhaserType.GameObjects.Text;
  upgradeLivesText: PhaserType.GameObjects.Text;
  hudLeftText: PhaserType.GameObjects.Text;
  hudCenterText: PhaserType.GameObjects.Text;
  hudRightText: PhaserType.GameObjects.Text;
  livesText: PhaserType.GameObjects.Text;
  cannonAngleText: PhaserType.GameObjects.Text;
  powerupStatusText: PhaserType.GameObjects.Text;
}

export function updateMenuHud(els: MenuHudElements, opts: MenuHudOptions = {}): void {
  const x = opts.bestScoreTextX ?? -1;
  const y = opts.bestScoreTextY ?? -1;
  const bs = loadBestScore();
  const bd = loadBestDistance();
  const bestLine = formatBestLine(bs, bd);
  if (bestLine !== "") {
    els.bestScoreText.setText(bestLine).setVisible(true);
    if (x >= 0 && y >= 0) els.bestScoreText.setPosition(x, y);
  } else {
    els.bestScoreText.setText("").setVisible(false);
  }

  const tc = loadTotalCoins();
  els.coinsText.setText(formatCoinsLine(tc)).setVisible(true);

  const ups = loadUpgradeState();
  els.upgradeFireText.setText(formatFireUpgradeLine(ups.fireLevel, tc)).setVisible(true);
  els.upgradeLivesText.setText(formatLivesUpgradeLine(ups.livesLevel, tc)).setVisible(true);

  // Hide HUD elements during menu
  els.hudLeftText.setVisible(false);
  els.hudCenterText.setVisible(false);
  els.hudRightText.setVisible(false);
  els.livesText.setVisible(false);
  els.cannonAngleText.setVisible(false);
  els.powerupStatusText.setVisible(false);
}
