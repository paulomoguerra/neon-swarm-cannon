import Phaser from "phaser";
import type { EnemyKind, PickupKind, PowerupKind, Team } from "./types";

const UNIT_COLORS = [0x35a8ff, 0x2acb74, 0xffc747, 0xff7c42, 0xb66cff];
const UNIT_DARK_COLORS = [0x176fb7, 0x158949, 0xba7f14, 0xb94520, 0x6f31ad];

// ─── Cannon ─────────────────────────────────────────────────────────────────

export function createCannon(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  if (scene.textures.exists("cannon-hover-option-b")) {
    const sprite = scene.add.image(0, 0, "cannon-hover-option-b");
    sprite.setOrigin(0.5, 0.42);
    sprite.setScale(0.23);
    sprite.setName("cannon-hover-option-b");
    container.add(sprite);
    return container;
  }

  // Lightweight fallback for tests/dev if the raster asset fails to load.
  const shadow = scene.add.ellipse(0, 32, 84, 20, 0x000000, 0.28);
  const body = scene.add.ellipse(0, 5, 76, 48, 0x1c344a, 1);
  body.setStrokeStyle(4, 0x4aaed0, 0.75);
  const barrel = scene.add.rectangle(0, -42, 18, 54, 0x18283a, 1);
  barrel.setStrokeStyle(3, 0x80dfff, 0.85);
  const core = scene.add.circle(0, 0, 18, 0x39dfff, 1);
  core.setStrokeStyle(4, 0x0b5370, 0.9);
  container.add([shadow, body, barrel, core]);

  return container;
}

// ─── Mobs ────────────────────────────────────────────────────────────────────

const MOB_COLORS: Record<Team, { body: number; outline: number; glow: number }> = {
  blue: { body: 0x52c8ff, outline: 0x0a5aa0, glow: 0x1890e0 },
  red: { body: 0xf05050, outline: 0x8b1a1a, glow: 0xcc3030 },
};

const ENEMY_DRONES = [
  { kind: "grunt", key: "enemy-grunt", scale: 0.105 },
  { kind: "runner", key: "enemy-runner", scale: 0.115 },
  { kind: "brute", key: "enemy-brute", scale: 0.11 },
  { kind: "shielded", key: "enemy-shielded", scale: 0.12 },
  { kind: "bomber", key: "enemy-bomber", scale: 0.15 },
] as const;

export function createMob(scene: Phaser.Scene, team: Team, x: number, y: number, enemyKind?: EnemyKind): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const colors = MOB_COLORS[team];

  if (team === "blue") {
    // Friendly shots read as cyan energy bolts from the hover cannon.
    const trail = scene.add.ellipse(0, 14, 18, 30, 0x00d8ff, 0.18);
    const glow = scene.add.circle(0, 0, 19, 0x00bfff, 0.28);
    const outer = scene.add.ellipse(0, 0, 24, 22, 0x53d8ff, 1);
    outer.setStrokeStyle(3, 0x075f9f, 0.92);
    const core = scene.add.circle(0, -1, 8, 0xbdf8ff, 0.95);
    const shine = scene.add.ellipse(-4, -6, 7, 5, 0xffffff, 0.42);
    const shadow = scene.add.ellipse(0, 15, 24, 8, 0x000000, 0.18);
    container.add([trail, glow, shadow, outer, core, shine]);
    return container;
  }

  const preferredDrone = enemyKind
    ? ENEMY_DRONES.find((drone) => drone.kind === enemyKind && scene.textures.exists(drone.key))
    : undefined;
  const availableDrones = ENEMY_DRONES.filter((drone) => scene.textures.exists(drone.key));
  if (availableDrones.length > 0) {
    const drone = preferredDrone ?? availableDrones[Phaser.Math.Between(0, availableDrones.length - 1)];
    const sprite = scene.add.image(0, 0, drone.key);
    sprite.setOrigin(0.5, 0.56);
    sprite.setScale(drone.scale);
    sprite.setName(drone.key);
    container.add(sprite);
    return container;
  }

  // Glow ring behind enemy mob
  const glow = scene.add.ellipse(0, 0, 30, 26, colors.glow, 0.35);

  // Drop shadow
  const shadow = scene.add.ellipse(0, 15, 28, 10, 0x000000, 0.22);

  // Main body (ellipse)
  const body = scene.add.ellipse(0, 0, 22, 20, colors.body);
  body.setStrokeStyle(3, colors.outline);

  // Inner highlight
  const highlight = scene.add.ellipse(-3, -4, 8, 6, 0xffffff, 0.3);

  container.add([glow, shadow, body, highlight]);
  return container;
}

export function createGate(scene: Phaser.Scene, label: string, x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  // Glow backdrop behind gate
  const glow = scene.add.rectangle(0, 0, width + 8, height + 8, 0x00c8ff, 0.12);

  // Translucent bright blue/cyan plate
  const plate = scene.add.rectangle(0, 0, width, height, 0x00c8ff, 0.22);
  plate.setStrokeStyle(3, 0x00e5ff, 0.95);

  // White border highlight on top
  const topBar = scene.add.rectangle(0, -height / 2 + 3, width, 6, 0xffffff, 0.6);

  // Label text — crisp white with cyan stroke
  const text = scene.add.text(0, 0, label, {
    fontFamily: "Arial",
    fontSize: "28px",
    color: "#ffffff",
    fontStyle: "bold",
    stroke: "#0077bb",
    strokeThickness: 5,
  }).setOrigin(0.5);

  container.add([glow, plate, topBar, text]);
  container.setDepth(18);
  return container;
}

// ─── Enemy Base ───────────────────────────────────────────────────────────────

export function createEnemyBase(scene: Phaser.Scene, x: number, y: number, hp: number, maxHp: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  // Fortress shadow
  const shadow = scene.add.ellipse(0, 36, 170, 28, 0x000000, 0.28);

  // Fortress body — wide rectangular base with better color
  const body = scene.add.rectangle(0, 0, 164, 64, 0x8b2020);
  body.setStrokeStyle(4, 0x5a1010);

  // Battlements / crenellations (top row of squares)
  const battlementY = -28;
  const bw = 22;
  const bh = 18;
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue; // skip center
    const bx = i * 22;
    const brick = scene.add.rectangle(bx, battlementY, bw - 4, bh, 0xaa3030);
    brick.setStrokeStyle(2, 0x5a1010);
    container.add(brick);
  }

  // Center tower
  const tower = scene.add.rectangle(0, -10, 50, 46, 0x7a1c1c);
  tower.setStrokeStyle(3, 0x5a1010);
  container.add(tower);

  // Tower highlight stripe
  const towerHi = scene.add.rectangle(-12, -14, 8, 36, 0xffffff, 0.08);
  container.add(towerHi);

  // HP bar background
  const barBg = scene.add.rectangle(0, 38, 144, 12, 0x141414);
  barBg.setStrokeStyle(1, 0x555555);

  // HP bar fill
  const ratio = Math.max(0, hp / maxHp);
  const barFill = scene.add.rectangle(-72, 38, 140 * ratio, 10, 0x44cc44);
  barFill.setOrigin(0, 0.5);

  // HP text label
  const hpText = scene.add.text(0, 38, `${hp}/${maxHp}`, {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#ffffff",
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 4,
  }).setOrigin(0.5);

  // Store references for updates
  container.setDataEnabled();
  container.setData("hpText", hpText);
  container.setData("barFill", barFill);
  container.setData("barBg", barBg);

  container.add([shadow, body, tower, barBg, barFill, hpText]);
  container.setDepth(16);
  return container;
}

export function updateEnemyBaseVisual(container: Phaser.GameObjects.Container, hp: number, maxHp: number): void {
  const hpText = container.getData("hpText") as Phaser.GameObjects.Text;
  const barFill = container.getData("barFill") as Phaser.GameObjects.Rectangle;

  if (hpText) hpText.setText(`${hp}/${maxHp}`);
  if (barFill) {
    const ratio = Math.max(0, hp / maxHp);
    barFill.width = 138 * ratio;
    // Color shift: green -> yellow -> red
    if (ratio > 0.5) {
      barFill.fillColor = 0x44cc44;
    } else if (ratio > 0.25) {
      barFill.fillColor = 0xcccc44;
    } else {
      barFill.fillColor = 0xcc4444;
    }
  }
}

// ─── Barrier ──────────────────────────────────────────────────────────────────

export function createBarrier(scene: Phaser.Scene, id: number, x: number, y: number, width: number, height: number, hp: number, maxHp: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);

  // Shadow
  const shadow = scene.add.ellipse(0, height / 2 + 4, width, 10, 0x000000, 0.25);

  // Main block: orange/brick color
  const body = scene.add.rectangle(0, 0, width, height, 0xd9800a);
  body.setStrokeStyle(3, 0x8a5000);

  // Top highlight bar
  const topBar = scene.add.rectangle(0, -height / 2 + 3, width, 5, 0xffcc66, 0.85);

  // Bottom shadow bar
  const bottomBar = scene.add.rectangle(0, height / 2 - 3, width, 4, 0x000000, 0.2);

  // HP text
  const hpText = scene.add.text(0, 0, String(hp), {
    fontFamily: "Arial",
    fontSize: "18px",
    color: "#ffffff",
    fontStyle: "bold",
    stroke: "#5a3000",
    strokeThickness: 3,
  }).setOrigin(0.5);

  // Store for updates
  container.setDataEnabled();
  container.setData("hpText", hpText);
  container.setData("body", body);

  container.add([shadow, body, topBar, bottomBar, hpText]);
  container.setDepth(19);
  return container;
}

export function updateBarrierVisual(container: Phaser.GameObjects.Container, hp: number, maxHp: number): void {
  const hpText = container.getData("hpText") as Phaser.GameObjects.Text;
  const body = container.getData("body") as Phaser.GameObjects.Rectangle;

  if (hpText) hpText.setText(String(hp));
  if (body) {
    const ratio = hp / maxHp;
    if (ratio > 0.6) {
      body.fillColor = 0xd9800a;
    } else if (ratio > 0.3) {
      body.fillColor = 0xaa6008;
    } else {
      body.fillColor = 0x883005;
    }
  }
}

// ─── Power-up ─────────────────────────────────────────────────────────────────

const POWERUP_COLORS: Record<PowerupKind, { bg: number; fg: number; glow: number }> = {
  shield: { bg: 0x00e8ff, fg: 0x003344, glow: 0x00c8dd },
  rapid: { bg: 0xff8800, fg: 0x332200, glow: 0xff6600 },
};

export function createPowerup(scene: Phaser.Scene, kind: PowerupKind, x: number, y: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const c = POWERUP_COLORS[kind];

  // Glow ring
  const glow = scene.add.circle(0, 0, 26, c.glow, 0.3);
  // Body disc
  const disc = scene.add.circle(0, 0, 20, c.bg);
  disc.setStrokeStyle(3, 0xffffff, 0.9);
  // Label
  const labelColor = kind === "shield" ? "#00eeff" : "#ffcc00";
  const strokeColor = kind === "shield" ? "#003344" : "#332200";
  const label = scene.add.text(0, 1, kind === "shield" ? "SH" : "RF", {
    fontFamily: "Arial",
    fontSize: "14px",
    color: labelColor,
    fontStyle: "bold",
    stroke: strokeColor,
    strokeThickness: 3,
  }).setOrigin(0.5);

  container.add([glow, disc, label]);
  container.setDepth(25);
  return container;
}

// ─── Legacy art helpers (kept for compatibility) ─────────────────────────────

export function createUnit(scene: Phaser.Scene, level: number): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const color = UNIT_COLORS[level - 1] ?? UNIT_COLORS[UNIT_COLORS.length - 1];
  const dark = UNIT_DARK_COLORS[level - 1] ?? UNIT_DARK_COLORS[UNIT_DARK_COLORS.length - 1];
  const shadow = scene.add.ellipse(0, 18, 58 + level * 5, 24, 0x000000, 0.22);
  const leftTrack = scene.add.rectangle(-18, 8, 14, 33 + level * 2, 0x273a48);
  leftTrack.setStrokeStyle(2, 0xffffff, 0.65);
  const rightTrack = scene.add.rectangle(18, 8, 14, 33 + level * 2, 0x273a48);
  rightTrack.setStrokeStyle(2, 0xffffff, 0.65);
  const hull = scene.add.rectangle(0, 6, 42 + level * 4, 34 + level * 2, color);
  hull.setStrokeStyle(3, 0xffffff);
  const turret = scene.add.circle(0, -2, 14 + level, dark);
  turret.setStrokeStyle(2, 0xffffff);
  const barrel = scene.add.rectangle(0, -23, 9, 31 + level * 4, 0x263a4f);
  barrel.setStrokeStyle(1, 0xffffff, 0.8);
  const highlight = scene.add.rectangle(-9, 3, 9, 24, 0xffffff, 0.28);
  const badgeBack = scene.add.circle(20, 19, 13, 0xffffff);
  const badge = scene.add.text(20, 20, String(level), {
    fontFamily: "Arial",
    fontSize: "17px",
    color: "#1e3f5d",
    fontStyle: "bold",
  }).setOrigin(0.5);
  container.add([shadow, leftTrack, rightTrack, hull, turret, barrel, highlight, badgeBack, badge]);
  return container;
}

export function createZombie(scene: Phaser.Scene, x: number, y: number, elite: boolean): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 18, elite ? 62 : 48, elite ? 24 : 19, 0x000000, 0.2);
  const body = scene.add.rectangle(0, 2, elite ? 42 : 32, elite ? 40 : 31, elite ? 0x8f55b8 : 0x78b943);
  body.setStrokeStyle(3, elite ? 0x4d226b : 0x27521f);
  const head = scene.add.circle(0, -21, elite ? 16 : 13, elite ? 0xa96bce : 0x91d958);
  head.setStrokeStyle(2, 0xffffff, 0.45);
  const eyes = scene.add.rectangle(0, -24, elite ? 21 : 16, 4, 0xfff0c2);
  const armA = scene.add.rectangle(-25, 2, 20, 6, elite ? 0x4d226b : 0x27521f);
  armA.rotation = -0.25;
  const armB = scene.add.rectangle(25, 2, 20, 6, elite ? 0x4d226b : 0x27521f);
  armB.rotation = 0.25;
  container.add([shadow, armA, armB, body, head, eyes]);
  return container;
}

export function flashZombie(container: Phaser.GameObjects.Container): void {
  for (const child of container.list) {
    if (child instanceof Phaser.GameObjects.Shape) {
      child.setAlpha(0.65);
    }
  }
}

export function createRecruit(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const ring = scene.add.circle(0, 0, 27, 0x7fe8ff, 0.35);
  ring.setStrokeStyle(3, 0xffffff);
  const base = scene.add.rectangle(0, 4, 34, 28, 0x35a8ff);
  base.setStrokeStyle(3, 0xffffff);
  const turret = scene.add.circle(0, -2, 11, 0x176fb7);
  const barrel = scene.add.rectangle(0, -19, 7, 22, 0x263a4f);
  const plus = scene.add.text(0, 27, "+", {
    fontFamily: "Arial",
    fontSize: "24px",
    color: "#ffffff",
    fontStyle: "bold",
  }).setOrigin(0.5);
  container.add([ring, base, turret, barrel, plus]);
  return container;
}

export function createCrate(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 18, 68, 22, 0x000000, 0.18);
  const base = scene.add.rectangle(0, 0, 58, 42, 0xc85b3e);
  base.setStrokeStyle(3, 0x6a261b);
  const stripe = scene.add.rectangle(0, 0, 12, 42, 0xffd85d);
  const lid = scene.add.rectangle(0, -23, 64, 8, 0x9d3a2a);
  container.add([shadow, base, stripe, lid]);
  return container;
}

export function createPickup(scene: Phaser.Scene, x: number, y: number, kind: PickupKind): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const color = kind === "boost" ? 0xffd85d : 0x68e58e;
  const star = scene.add.star(0, 0, 5, 12, 26, color);
  star.setStrokeStyle(3, 0xffffff);
  const label = scene.add.text(0, 1, kind === "boost" ? "x2" : "S", {
    fontFamily: "Arial",
    fontSize: "16px",
    color: "#253241",
    fontStyle: "bold",
  }).setOrigin(0.5);
  container.add([star, label]);
  return container;
}
