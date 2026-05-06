import Phaser from "phaser";

export type Mode = "menu" | "playing" | "gameover" | "victory";
export type Team = "blue" | "red";
export type WeaponKind = "laser" | "spread" | "rail";
export type EnemyKind = "grunt" | "runner" | "brute" | "shielded" | "bomber";
export type EnemyAttackKind = "contact";

export type WeaponUpgradeState = {
  unlocked: boolean;
  level: number;
};

export type WeaponSessionState = {
  equippedWeapon: WeaponKind;
  sessionTech: number;
  weapons: Record<WeaponKind, WeaponUpgradeState>;
};

export type Mob = {
  id: number;
  team: Team;
  body: Phaser.GameObjects.Container;
  hp: number;
  vx: number;
  vy: number;
  weaponKind?: WeaponKind;
  damage?: number;
  pierceRemaining?: number;
  enemyKind?: EnemyKind;
  attackKind?: EnemyAttackKind;
};

export type GateKind = "multiply" | "add";

export type Gate = {
  id: number;
  kind: GateKind;
  value: number;
  body: Phaser.GameObjects.Container;
  x: number;
  y: number;
  width: number;
  height: number;
  processedMobIds: Set<number>;
};

export type Cannon = {
  body: Phaser.GameObjects.Container;
  x: number;
  y: number;
  angle: number;
  fireCooldown: number;
};

export type EnemyBase = {
  body: Phaser.GameObjects.Container;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
};

export type Barrier = {
  id: number;
  body: Phaser.GameObjects.Container;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
};

// Legacy types retained for backward compatibility during transition
export type Unit = {
  level: number;
  body: Phaser.GameObjects.Container;
};

export type Zombie = {
  body: Phaser.GameObjects.Container;
  hp: number;
  lane: number;
  speed: number;
};

export type Bullet = {
  body: Phaser.GameObjects.Rectangle;
  damage: number;
  vx: number;
  vy: number;
};

export type Recruit = {
  body: Phaser.GameObjects.Container;
  lane: number;
};

export type Obstacle = {
  body: Phaser.GameObjects.Container;
  lane: number;
};

export type Pickup = {
  body: Phaser.GameObjects.Container;
  kind: "boost" | "shield";
  lane: number;
};

export type PickupKind = "boost" | "shield";

export type PowerupKind = "shield" | "rapid";

export type Powerup = {
  id: number;
  kind: PowerupKind;
  body: Phaser.GameObjects.Container;
  x: number;
  y: number;
};

export type UpgradeState = {
  fireLevel: number;
  livesLevel: number;
};

export type TrackedBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  active: boolean;
  destroy: () => void;
};
