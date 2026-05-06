// Portrait-first canvas: swapped from 960x540 to 540x960
// All layout constants use proportional scaling from the original landscape design.
// X positions scaled by 540/960 = 0.5625; Y positions scaled by 960/540 ≈ 1.778.
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;
export const LANES = [141, 191, 242, 293, 344, 395] as const;
export const LANE_CENTER = 268;
export const SQUAD_Y = 711;
export const MAX_UNITS = 12;
export const MAX_UNIT_LEVEL = 5;

// Cannon (bottom-center, Mob Control style) — Y scaled from 540-70=470 to 960*0.872 ≈ 837
export const CANNON_X = GAME_WIDTH / 2;
export const CANNON_Y = 837;
export const CANNON_MUZZLE_OFFSET = 42;

// Mob Control mob tuning — Y scaled from 540-90=450 to 960*0.833 ≈ 800
export const MOB_TUNING = {
  blueSpeed: 280,
  redSpeed: 60,
  fireInterval: 0.28,
  redSpawnInterval: 2.2,
  maxBlueMobs: 180,
  maxRedMobs: 80,
  collisionRadius: 22,
  cannonDangerY: 800,
  cannonDangerXRadius: 45,
} as const;

// Angle clamp: allow upward cone from ~150° to ~30° in standard coords
// Phaser angle: 0 = right, +PI/2 = down, -PI/2 = up
// We want: clamp between -150° (-5PI/6) and -30° (-PI/6)
export const CANNON_ANGLE_MIN = -Math.PI * 5 / 6;
export const CANNON_ANGLE_MAX = -Math.PI / 6;

export const RUN_TUNING = {
  startingUnits: 5,
  baseSpeed: 105,
  maxSpeedBonus: 145,
  speedDistanceScale: 0.38,
  distanceScale: 0.08,
  startZombieDelay: 1.2,
  startRecruitDelay: 1.1,
  startObstacleDelay: 2.8,
  startPickupDelay: 6.5,
  boostDuration: 6.5,
  spawnBufferY: -45,
};

export const SQUAD_FORMATION = [
  { x: 0, y: 0 },
  { x: -34, y: 26 },
  { x: 34, y: 26 },
  { x: -68, y: 52 },
  { x: 0, y: 52 },
  { x: 68, y: 52 },
  { x: -98, y: 78 },
  { x: -34, y: 78 },
  { x: 34, y: 78 },
  { x: 98, y: 78 },
  { x: -128, y: 104 },
  { x: 128, y: 104 },
] as const;

// Level 1 gate definitions: { kind, value, x, y, width, height }
// X scaled by 540/960 = 0.5625; Y scaled by 960/540 ≈ 1.778
export const LEVEL_1_GATES = [
  { kind: "multiply" as const, value: 2, x: 180, y: 438, width: 73, height: 54 },
  { kind: "multiply" as const, value: 3, x: 360, y: 438, width: 73, height: 54 },
  { kind: "add" as const, value: 10, x: 270, y: 276, width: 79, height: 54 },
];

// Legacy single-base config retained for debug/test compatibility during the
// dual-reactor transition.
export const ENEMY_BASE_CONFIG = {
  x: GAME_WIDTH / 2,
  y: 103,
  maxHp: 65,
  hitDamagePerMob: 1,
};

export const REACTOR_CONFIGS = [
  { id: 0, side: "left" as const, x: 180, y: 112, maxHp: 45 },
  { id: 1, side: "right" as const, x: 360, y: 112, maxHp: 45 },
] as const;

export const REACTOR_HIT_DAMAGE_PER_MOB = 1;
export const REACTOR_RESET_DELAY = 2.2;
export const DUAL_BREACH_COIN_BONUS = 10;
export const DUAL_BREACH_TECH_BONUS = 5;

// Level 1 barriers: blocks between gates and base — Y scaled by 1.778
export const LEVEL_1_BARRIERS = [
  { id: 0, x: 270, y: 362, width: 46, height: 58, hp: 16, maxHp: 16 },
  { id: 1, x: 180, y: 590, width: 58, height: 34, hp: 10, maxHp: 10 },
  { id: 2, x: 360, y: 590, width: 58, height: 34, hp: 10, maxHp: 10 },
];

// Endless run tuning
export const ENDLESS_TUNING = {
  baseHpStart: 65,
  baseHpPerCheckpoint: 25,
  barrierHpScalePerWave: 0.12,
  waveDuration: 18,
  scorePerDistance: 1,
  scorePerKill: 25,
  scorePerCheckpoint: 150,
  baseDistancePerSecond: 35,
  maxDistanceBonus: 90,
  distanceBonusPerSecond: 1.2,
  redSpawnIntervalStart: 2.2,
  redSpawnIntervalMin: 0.75,
  redSpawnIntervalDecay: 0.12,
  redSpeedStart: 60,
  redSpeedMaxBonus: 55,
  redSpeedPerWave: 5,
  dangerGraceSeconds: 45,
};

// Cannon horizontal movement bounds — X scaled by 540/960 = 0.5625
export const CANNON_MIN_X = 135;
export const CANNON_MAX_X = 405;

// Keyboard cannon movement speed (pixels per second)
export const KEYBOARD_CANNON_SPEED = 320;

// Power-up settings
export const POWERUP_SPAWN_INTERVAL = 14; // seconds between spawns
export const POWERUP_FALL_SPEED = 80;
export const SHIELD_DURATION = 10; // seconds
export const RAPID_DURATION = 7;   // seconds
export const RAPID_FIRE_MULT = 2.0; // fire rate multiplier when rapid active

// Coin rewards
export const COIN_PER_KILL = 1;
export const COIN_PER_CHECKPOINT = 15;
export const COIN_PER_BASE_DESTROY = 50;

// Session-only weapon economy. Tech is intentionally in-memory and resets on
// page refresh; persistent coin upgrades stay separate.
export const SESSION_TECH_PER_KILL = 1;
export const SESSION_TECH_PER_CHECKPOINT = 10;
export const WEAPON_MAX_LEVEL = 3;
export const WEAPON_KINDS = ["laser", "spread", "rail"] as const;
export const WEAPON_CONFIG = {
  laser: {
    label: "Laser Bolt",
    unlockCost: 0,
    upgradeCosts: [8, 18],
    fireIntervalMultiplier: 1,
    projectileCount: 1,
    spreadVx: 0,
    speedMultiplier: 1,
    damageByLevel: [1, 1, 2],
    pierceByLevel: [0, 0, 0],
  },
  spread: {
    label: "Spread Pulse",
    unlockCost: 12,
    upgradeCosts: [16, 32],
    fireIntervalMultiplier: 1.45,
    projectileCount: 3,
    spreadVx: 92,
    speedMultiplier: 1,
    damageByLevel: [1, 1, 2],
    pierceByLevel: [0, 0, 0],
  },
  rail: {
    label: "Rail Lance",
    unlockCost: 24,
    upgradeCosts: [28, 50],
    fireIntervalMultiplier: 2.05,
    projectileCount: 1,
    spreadVx: 0,
    speedMultiplier: 1.24,
    damageByLevel: [1, 2, 3],
    pierceByLevel: [2, 3, 4],
  },
} as const;

// Upgrade settings
export const UPGRADE_FIRE_COSTS = [60, 140, 280];
export const UPGRADE_LIVES_COSTS = [40, 100, 200];
export const UPGRADE_FIRE_REDUCTION = 0.04; // seconds removed from fireInterval per level
export const UPGRADE_LIVES_BONUS = 1;      // extra starting lives per level
export const UPGRADE_MAX_LEVEL = 3;
export const BASE_FIRE_INTERVAL = 0.28;
export const BASE_STARTING_LIVES = 3;

// Menu upgrade button geometry (menu only)
// BH increased from 40 to 56 for comfortable mobile touch targets
export const UPGRADE_BW = 260;
export const UPGRADE_BH = 56;
export const UPGRADE_FIRE_BY = 162;
export const UPGRADE_LIVES_BY = 232;
