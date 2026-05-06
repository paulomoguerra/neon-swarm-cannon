/**
 * debugSnapshot.ts — Pure-ish debug snapshot helpers.
 *
 * Provides types and serializer helpers for the `render_game_to_text()` hook
 * exposed on `window`. These functions map raw game entity arrays into the
 * JSON snapshot shape consumed by smoke tests.
 *
 * All functions are pure (no Phaser, no game state, no side effects) except
 * `stringifyGameDebugSnapshot` which calls JSON.stringify for convenience.
 */

import type { UpgradeState, WeaponSessionState } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameDebugSnapshot {
  note: string;
  mode: string;
  cannon: { x: number; y: number; angleDegrees: number } | null;
  runTimeSeconds: number;
  distanceMeters: number;
  score: number;
  wave: number;
  checkpointsDestroyed: number;
  cannonLives: number;
  blueMobCount: number;
  redMobCount: number;
  kills: number;
  bestScore: number;
  bestDistance: number;
  coins: number;
  totalCoins: number;
  upgrades: UpgradeState;
  weapons: WeaponSessionState;
  powerups: {
    shieldTimer: number;
    rapidTimer: number;
    active: Array<{ id: number; kind: string; x: number; y: number }>;
  };
  base: { hp: number; maxHp: number; x: number; y: number } | null;
  reactors: Array<{ id: number; side: string; hp: number; maxHp: number; x: number; y: number; destroyed: boolean }>;
  barriers: Array<{ id: number; hp: number; maxHp: number; x: number; y: number }>;
  gates: Array<{
    id: number;
    label: string;
    kind: string;
    value: number;
    x: number;
    y: number;
    processedCount: number;
  }>;
  visible: {
    blue: Array<{ x: number; y: number }>;
    red: Array<{ x: number; y: number }>;
  };
}

// ---------------------------------------------------------------------------
// Entity serializers (pure mapping helpers)
// ---------------------------------------------------------------------------

export function serializePowerups(
  active: Array<{ id: number; kind: string; x: number; y: number }>,
  shieldTimer: number,
  rapidTimer: number,
): GameDebugSnapshot["powerups"] {
  return {
    shieldTimer: Math.floor(shieldTimer * 10) / 10,
    rapidTimer: Math.floor(rapidTimer * 10) / 10,
    active: active.map((p) => ({ id: p.id, kind: p.kind, x: Math.round(p.x), y: Math.round(p.y) })),
  };
}

export function serializeBase(base: { hp: number; maxHp: number; x: number; y: number } | null): GameDebugSnapshot["base"] {
  if (!base) return null;
  return { hp: base.hp, maxHp: base.maxHp, x: base.x, y: base.y };
}

export function serializeReactors(
  reactors: Array<{ id: number; side: string; hp: number; maxHp: number; x: number; y: number; destroyed: boolean }>,
): GameDebugSnapshot["reactors"] {
  return reactors.map((r) => ({
    id: r.id,
    side: r.side,
    hp: r.hp,
    maxHp: r.maxHp,
    x: r.x,
    y: r.y,
    destroyed: r.destroyed,
  }));
}

export function serializeBarriers(
  barriers: Array<{ id: number; hp: number; maxHp: number; x: number; y: number }>,
): GameDebugSnapshot["barriers"] {
  return barriers.map((b) => ({ id: b.id, hp: b.hp, maxHp: b.maxHp, x: b.x, y: b.y }));
}

export function serializeGates(
  gates: Array<{
    id: number;
    kind: string;
    value: number;
    x: number;
    y: number;
    processedMobIds: Set<number>;
  }>,
): GameDebugSnapshot["gates"] {
  return gates.map((g) => ({
    id: g.id,
    label: g.kind === "multiply" ? `x${g.value}` : `+${g.value}`,
    kind: g.kind,
    value: g.value,
    x: g.x,
    y: g.y,
    processedCount: g.processedMobIds.size,
  }));
}

export function serializeVisibleMobs(
  blueMobs: Array<{ body: { active: boolean; x: number; y: number } }>,
  redMobs: Array<{ body: { active: boolean; x: number; y: number } }>,
): GameDebugSnapshot["visible"] {
  return {
    blue: blueMobs.filter((m) => m.body.active).slice(0, 6).map((m) => ({
      x: Math.round(m.body.x),
      y: Math.round(m.body.y),
    })),
    red: redMobs.filter((m) => m.body.active).slice(0, 6).map((m) => ({
      x: Math.round(m.body.x),
      y: Math.round(m.body.y),
    })),
  };
}

/** Convenience: serializes the full snapshot to a JSON string. */
export function stringifyGameDebugSnapshot(snapshot: GameDebugSnapshot): string {
  return JSON.stringify(snapshot);
}
