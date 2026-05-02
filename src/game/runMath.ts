/**
 * runMath.ts — pure endless-run formula helpers.
 *
 * These functions are stateless and depend only on tuning constants from ./config.
 * No Phaser or game object references.
 */

import { ENDLESS_TUNING, MOB_TUNING } from "./config";

/**
 * Current wave number from elapsed run time.
 * wave = 1 + floor(runTimeSeconds / waveDuration)
 */
export function calculateWave(runTimeSeconds: number): number {
  return 1 + Math.floor(runTimeSeconds / ENDLESS_TUNING.waveDuration);
}

/**
 * Distance added this frame.
 * base + min(runTime * bonusPerSecond, maxBonus)
 */
export function calculateDistanceDelta(runTimeSeconds: number, dt: number): number {
  return dt * (
    ENDLESS_TUNING.baseDistancePerSecond +
    Math.min(runTimeSeconds * ENDLESS_TUNING.distanceBonusPerSecond, ENDLESS_TUNING.maxDistanceBonus)
  );
}

/**
 * Total score from distance, kills, and checkpoints.
 * floor(distanceMeters * perDistance + kills * perKill + checkpoints * perCheckpoint)
 */
export function calculateScore(
  distanceMeters: number,
  kills: number,
  checkpointsDestroyed: number
): number {
  return Math.floor(
    distanceMeters * ENDLESS_TUNING.scorePerDistance +
    kills * ENDLESS_TUNING.scorePerKill +
    checkpointsDestroyed * ENDLESS_TUNING.scorePerCheckpoint
  );
}

/**
 * Spawn interval for red mobs at a given wave.
 * Uses (wave-1) so wave 1 starts at baseline.
 * max(minInterval, start - waveIdx * decay)
 */
export function calculateRedSpawnInterval(wave: number): number {
  const waveIdx = wave - 1;
  return Math.max(
    ENDLESS_TUNING.redSpawnIntervalMin,
    ENDLESS_TUNING.redSpawnIntervalStart - waveIdx * ENDLESS_TUNING.redSpawnIntervalDecay
  );
}

/**
 * Speed for red mobs at a given wave.
 * Uses (wave-1) so wave 1 starts at baseline.
 * base + min(waveIdx * perWave, maxBonus)
 */
export function calculateRedSpeed(wave: number): number {
  const waveIdx = wave - 1;
  return MOB_TUNING.redSpeed +
    Math.min(waveIdx * ENDLESS_TUNING.redSpeedPerWave, ENDLESS_TUNING.redSpeedMaxBonus);
}
