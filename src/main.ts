import Phaser from "phaser";
import { createCannon, createMob, createGate, createEnemyBase, updateEnemyBaseVisual, createBarrier, updateBarrierVisual, createPowerup } from "./game/art";
import {
  CANNON_MUZZLE_OFFSET,
  CANNON_X,
  CANNON_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  LEVEL_1_GATES,
  LEVEL_1_BARRIERS,
  MOB_TUNING,
  ENEMY_BASE_CONFIG,
  ENDLESS_TUNING,
  POWERUP_SPAWN_INTERVAL,
  POWERUP_FALL_SPEED,
  SHIELD_DURATION,
  RAPID_DURATION,
  RAPID_FIRE_MULT,
  COIN_PER_KILL,
  COIN_PER_CHECKPOINT,
  COIN_PER_BASE_DESTROY,
  UPGRADE_FIRE_COSTS,
  UPGRADE_LIVES_COSTS,
  UPGRADE_LIVES_BONUS,
  UPGRADE_MAX_LEVEL,
  UPGRADE_BW,
  UPGRADE_BH,
  UPGRADE_FIRE_BY,
  UPGRADE_LIVES_BY,
} from "./game/config";
import { drawWorld } from "./game/world";
import { showFloatingText, showRingPulse } from "./game/effects";
import {
  loadBestScore,
  loadBestDistance,
  saveBestScore,
  saveBestDistance,
  updateBestScore,
  loadTotalCoins,
  saveTotalCoins,
  loadUpgradeState,
  saveUpgradeState,
  effectiveFireInterval,
  startingLivesFromUpgrades,
} from "./game/progression";
import { calculateWave, calculateDistanceDelta, calculateScore, calculateRedSpawnInterval, calculateRedSpeed } from "./game/runMath";
import type { Cannon, Gate, Mob, Mode, EnemyBase, Barrier, Powerup, PowerupKind, UpgradeState } from "./game/types";
import type { ShopResult } from "./game/debugHooks";
import {
  formatBestLine,
  formatCoinsLine,
  formatFireUpgradeLine,
  formatLivesUpgradeLine,
} from "./game/uiText";
import { resolveMenuPointer, clampCannonX, stepKeyboardCannon, MENU_UPGRADE_BOUNDS } from "./game/inputSystem";
import { updatePlayingHud, clearPlayingHud, updateMenuHud } from "./game/hudSystem";
import {
  serializePowerups,
  serializeBase,
  serializeBarriers,
  serializeGates,
  serializeVisibleMobs,
  type GameDebugSnapshot,
} from "./game/debugSnapshot";
import "./styles.css";

class GameScene extends Phaser.Scene {
  private mode: Mode = "menu";

  // Cannon state
  private cannon: Cannon | null = null;
  private cannonAngle = -Math.PI / 2; // pointing up

  // Mob arrays
  private blueMobs: Mob[] = [];
  private redMobs: Mob[] = [];
  private nextMobId = 0;

  // Gates
  private gates: Gate[] = [];
  private gateFeedbackCooldown = 0;

  // Enemy base and barriers
  private enemyBase: EnemyBase | null = null;
  private barriers: Barrier[] = [];

  // Game state
  private kills = 0;

  // Endless run state
  private runTimeSeconds = 0;
  private distanceMeters = 0;
  private score = 0;
  private wave = 1;
  private checkpointsDestroyed = 0;
  private cannonLives = 0;

  // Best tracking (session-level, updated from localStorage)
  private bestScore = 0;
  private bestDistance = 0;

  // Coins and upgrades (session-level)
  private coins = 0;
  private totalCoins = 0;
  private upgradeState: UpgradeState = { fireLevel: 0, livesLevel: 0 };

  // Power-up state
  private powerups: Powerup[] = [];
  private nextPowerupId = 0;
  private powerupSpawnTimer = POWERUP_SPAWN_INTERVAL;
  private shieldTimer = 0;
  private rapidTimer = 0;

  // Cannon dragging
  private isDragging = false;
  private cannonTargetX = CANNON_X;

  // Keyboard cannon movement
  private keyLeft = false;
  private keyRight = false;

  // Timers
  private redSpawnTimer = 0;
  private feedbackCooldown = 0;

  // Graphics / UI
  private background!: Phaser.GameObjects.Graphics;
  private laneGraphics!: Phaser.GameObjects.Graphics;
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private overlayDim!: Phaser.GameObjects.Graphics;
  private endCard!: Phaser.GameObjects.Graphics;
  private promptButton!: Phaser.GameObjects.Graphics;
  private endPromptButton!: Phaser.GameObjects.Graphics;
  private upgradeFireBg!: Phaser.GameObjects.Graphics;
  private upgradeLivesBg!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private hudLeftText!: Phaser.GameObjects.Text;
  private hudCenterText!: Phaser.GameObjects.Text;
  private hudRightText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private upgradeFireText!: Phaser.GameObjects.Text;
  private upgradeLivesText!: Phaser.GameObjects.Text;
  private powerupStatusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private cannonAngleText!: Phaser.GameObjects.Text;
  private touchHintText!: Phaser.GameObjects.Text;
  private scrollOffset = 0;
  // Position constants for prompt text centering
  private static readonly MENU_PROMPT_Y = 378;
  private static readonly END_RESTART_PROMPT_Y = 370;
  private promptTween?: Phaser.Tweens.Tween;

  constructor() {
    super("game");
  }

  create(): void {
    this.background = this.add.graphics();
    this.background.setDepth(-20);
    this.laneGraphics = this.add.graphics();
    this.laneGraphics.setDepth(-10);
    this.uiGraphics = this.add.graphics();
    this.uiGraphics.setDepth(100);

    // Full-screen dim overlay for end states (hidden during play/menu)
    this.overlayDim = this.add.graphics();
    this.overlayDim.setDepth(105);
    this.overlayDim.setVisible(false);

    // End card — centered rounded modal for victory/gameover
    this.endCard = this.add.graphics();
    this.endCard.setDepth(106);
    this.endCard.setVisible(false);

    // Menu CTA button (rounded rectangle behind prompt text) — hidden while playing
    this.promptButton = this.add.graphics();
    this.promptButton.setDepth(109);
    this.promptButton.setVisible(false);

    // End-state restart button — hidden while playing/menu
    this.endPromptButton = this.add.graphics();
    this.endPromptButton.setDepth(110);
    this.endPromptButton.setVisible(false);

    // Upgrade button backgrounds (menu only)
    this.upgradeFireBg = this.add.graphics();
    this.upgradeFireBg.setDepth(109);
    this.upgradeFireBg.setVisible(false);
    this.upgradeLivesBg = this.add.graphics();
    this.upgradeLivesBg.setDepth(109);
    this.upgradeLivesBg.setVisible(false);

    // Title — styled with stroke and shadow for arcade feel
    this.titleText = this.add.text(GAME_WIDTH / 2, 78, "MOB CANNON", {
      fontFamily: "Arial",
      fontSize: "56px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#004488",
      strokeThickness: 8,
    }).setOrigin(0.5);
    this.titleText.setDepth(110);

    // Subtitle — "ENDLESS ARCADE SURVIVAL"
    this.subtitleText = this.add.text(GAME_WIDTH / 2, 126, "ENDLESS ARCADE SURVIVAL", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#f0c840",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.subtitleText.setDepth(110);

    // Best score text (shown on menu)
    this.bestScoreText = this.add.text(GAME_WIDTH / 2, 152, "", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#b0d8ff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.bestScoreText.setDepth(110);

    // HUD — left block (Score + Distance)
    this.hudLeftText = this.add.text(20, 15, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.hudLeftText.setDepth(110);

    // HUD — center block (Wave + Base HP — moved up + smaller to reduce top crowding)
    this.hudCenterText = this.add.text(GAME_WIDTH / 2, 9, "", {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5, 0);
    this.hudCenterText.setDepth(110);

    // HUD — right block (Red mob count + kills compact)
    this.hudRightText = this.add.text(GAME_WIDTH - 20, 15, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(1, 0);
    this.hudRightText.setDepth(110);

    // Lives — below right HUD (y pushed down to 46 for more breathing room)
    this.livesText = this.add.text(GAME_WIDTH - 20, 46, "", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ff5555",
      fontStyle: "bold",
    }).setOrigin(1, 0);
    this.livesText.setDepth(110);

    // Angle indicator
    this.cannonAngleText = this.add.text(GAME_WIDTH - 22, GAME_HEIGHT - 12, "", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#f0c040",
      fontStyle: "bold",
    }).setOrigin(1, 1);
    this.cannonAngleText.setDepth(110);

    // Coins display (shown below best score on menu)
    this.coinsText = this.add.text(GAME_WIDTH / 2, 168, "", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#ffd700",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.coinsText.setDepth(110);

    // Touch/mobile control hint — shown only during gameplay, low-alpha, lower area
    this.touchHintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 18, "DRAG TO MOVE", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0.4);
    this.touchHintText.setDepth(110);
    this.touchHintText.setVisible(false);

    // Upgrade buttons (shown on menu below coins)
    this.upgradeFireText = this.add.text(GAME_WIDTH / 2, 190, "", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#aaddff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.upgradeFireText.setDepth(110);

    this.upgradeLivesText = this.add.text(GAME_WIDTH / 2, 240, "", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffaaaa",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.upgradeLivesText.setDepth(110);

    // Power-up status indicator (small HUD element)
    this.powerupStatusText = this.add.text(20, 60, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.powerupStatusText.setDepth(110);

    // Prompt text — used for both menu CTA and end-state restart
    this.promptText = this.add.text(GAME_WIDTH / 2, 390, "START RUN", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.promptText.setDepth(110);

    // Load best from localStorage
    this.bestScore = loadBestScore();
    this.bestDistance = loadBestDistance();

    // Controls
    this.input.keyboard?.on("keydown-SPACE", () => this.handleAction());
    this.input.keyboard?.on("keydown-ENTER", () => this.handleAction());
    this.input.keyboard?.on("keydown-F", () => this.toggleFullscreen());
    this.input.keyboard?.on("keydown-1", () => this.handleUpgradeKey("fire"));
    this.input.keyboard?.on("keydown-2", () => this.handleUpgradeKey("lives"));
    this.input.keyboard?.on("keydown-LEFT", () => { this.keyLeft = true; });
    this.input.keyboard?.on("keydown-RIGHT", () => { this.keyRight = true; });
    this.input.keyboard?.on("keyup-LEFT", () => { this.keyLeft = false; });
    this.input.keyboard?.on("keyup-RIGHT", () => { this.keyRight = false; });
    this.input.keyboard?.on("keydown-A", () => { this.keyLeft = true; });
    this.input.keyboard?.on("keydown-D", () => { this.keyRight = true; });
    this.input.keyboard?.on("keyup-A", () => { this.keyLeft = false; });
    this.input.keyboard?.on("keyup-D", () => { this.keyRight = false; });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.mode === "playing" && this.isDragging) {
        this.moveCannonToX(pointer.x);
      }
    });
    this.input.on("pointerup", () => { this.isDragging = false; });

    this.drawScene();
    this.updateHud();
    this.publishTestHooks();
    this.renderMenuState();
  }

  // Draw the menu CTA button (rounded rect behind promptText)
  private drawMenuPromptButton(): void {
    this.promptButton.clear();
    const bw = 240;
    const bh = 54;
    const bx = GAME_WIDTH / 2 - bw / 2;
    const by = 378 - bh / 2;
    // Shadow
    this.promptButton.fillStyle(0x000000, 0.35);
    this.promptButton.fillRoundedRect(bx + 3, by + 4, bw, bh, 14);
    // Button body
    this.promptButton.fillStyle(0xf0b840, 0.95);
    this.promptButton.fillRoundedRect(bx, by, bw, bh, 14);
    // Border
    this.promptButton.lineStyle(2, 0xffffff, 0.6);
    this.promptButton.strokeRoundedRect(bx, by, bw, bh, 14);
  }

  // Draw an upgrade button background (fire or lives) on the menu
  private drawUpgradeButtonBg(which: "fire" | "lives"): void {
    const bg = which === "fire" ? this.upgradeFireBg : this.upgradeLivesBg;
    const by = which === "fire" ? UPGRADE_FIRE_BY : UPGRADE_LIVES_BY;
    const ups = loadUpgradeState();
    const tc = loadTotalCoins();
    const maxed = which === "fire" ? ups.fireLevel >= UPGRADE_MAX_LEVEL : ups.livesLevel >= UPGRADE_MAX_LEVEL;
    const cost = which === "fire"
      ? (ups.fireLevel < UPGRADE_MAX_LEVEL ? UPGRADE_FIRE_COSTS[ups.fireLevel] : 0)
      : (ups.livesLevel < UPGRADE_MAX_LEVEL ? UPGRADE_LIVES_COSTS[ups.livesLevel] : 0);
    const canAfford = !maxed && tc >= cost;

    bg.clear();
    const bx = GAME_WIDTH / 2 - UPGRADE_BW / 2;
    const bw = UPGRADE_BW;
    const bh = UPGRADE_BH;

    // Shadow
    bg.fillStyle(0x000000, 0.3);
    bg.fillRoundedRect(bx + 2, by + 3, bw, bh, 8);
    // Button fill — green-ish if affordable, muted grey if not
    const fillColor = maxed ? 0x334455 : (canAfford ? 0x225533 : 0x443333);
    bg.fillStyle(fillColor, 0.85);
    bg.fillRoundedRect(bx, by, bw, bh, 8);
    // Border — bright if affordable, dim if not
    const borderColor = maxed ? 0x667788 : (canAfford ? 0x44ff88 : 0x886666);
    bg.lineStyle(1, borderColor, maxed ? 0.5 : (canAfford ? 0.9 : 0.6));
    bg.strokeRoundedRect(bx, by, bw, bh, 8);
  }

  // Draw the end-state overlay: full dim + centered card + restart button + summary
  private drawEndOverlay(title: string, subtitle: string): void {
    // Full-screen dim
    this.overlayDim.clear();
    this.overlayDim.fillStyle(0x000000, 0.60);
    this.overlayDim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Centered card
    const cw = 480;
    const ch = 270;
    const cx = GAME_WIDTH / 2 - cw / 2;
    const cy = GAME_HEIGHT / 2 - ch / 2;

    this.endCard.clear();
    // Card shadow
    this.endCard.fillStyle(0x000000, 0.4);
    this.endCard.fillRoundedRect(cx + 5, cy + 7, cw, ch, 20);
    // Card body — dark navy
    this.endCard.fillStyle(0x0d1e30, 0.96);
    this.endCard.fillRoundedRect(cx, cy, cw, ch, 20);
    // Card border — gold/white
    this.endCard.lineStyle(3, 0xf0c040, 0.8);
    this.endCard.strokeRoundedRect(cx, cy, cw, ch, 20);
    // Inner accent line at top of card
    this.endCard.lineStyle(2, 0x3a6080, 0.5);
    this.endCard.strokeRoundedRect(cx + 8, cy + 8, cw - 16, ch - 16, 16);

    // End-state restart button inside card
    const bw = 280;
    const bh = 52;
    const bx = GAME_WIDTH / 2 - bw / 2;
    const by = cy + ch - 80;
    this.endPromptButton.clear();
    this.endPromptButton.fillStyle(0x000000, 0.3);
    this.endPromptButton.fillRoundedRect(bx + 2, by + 3, bw, bh, 13);
    this.endPromptButton.fillStyle(0xf0b840, 0.95);
    this.endPromptButton.fillRoundedRect(bx, by, bw, bh, 13);
    this.endPromptButton.lineStyle(2, 0xffffff, 0.55);
    this.endPromptButton.strokeRoundedRect(bx, by, bw, bh, 13);
  }

  private startPromptPulse(): void {
    if (this.promptTween) this.promptTween.stop();
    this.promptTween = this.tweens.add({
      targets: this.promptText,
      alpha: 0.55,
      duration: 700,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private stopPromptPulse(): void {
    if (this.promptTween) {
      this.promptTween.stop();
      this.promptTween = undefined;
    }
    this.promptText.setAlpha(1);
  }

  // Hide all menu-only UI elements (title, upgrade shop, coins, prompt)
  private hideMenuUi(): void {
    this.titleText.setVisible(false);
    this.subtitleText.setVisible(false);
    this.bestScoreText.setVisible(false);
    this.promptText.setVisible(false);
    this.stopPromptPulse();
    this.promptButton.setVisible(false);
    this.upgradeFireBg.setVisible(false);
    this.upgradeLivesBg.setVisible(false);
    this.upgradeFireText.setVisible(false);
    this.upgradeLivesText.setVisible(false);
    this.coinsText.setVisible(false);
  }

  // Hide the end-state overlay (dim + card + restart button)
  private hideEndOverlay(): void {
    this.overlayDim.setVisible(false);
    this.endCard.setVisible(false);
    this.endPromptButton.setVisible(false);
  }

  // Show gameplay HUD elements when entering play mode
  private showGameplayHud(): void {
    this.hudLeftText.setVisible(true);
    this.hudCenterText.setVisible(true);
    this.hudRightText.setVisible(true);
    this.livesText.setVisible(true);
    this.cannonAngleText.setVisible(true);
    this.touchHintText.setVisible(true);
  }

  update(_time: number, deltaMs: number): void {
    this.stepGame(deltaMs / 1000);
  }

  stepGame(dt: number): void {
    if (this.mode !== "playing") {
      this.renderMenuState();
      return;
    }
    this.drawScene();

    // Keyboard cannon movement (ArrowLeft/A = left, ArrowRight/D = right)
    if (this.cannon) {
      // Only update target when keyboard is actively pressed; otherwise preserve
      // the existing target so the lerp can continue moving toward it (e.g., after drag).
      if (this.keyLeft || this.keyRight) {
        this.cannonTargetX = stepKeyboardCannon(
          this.cannon.body.x,
          this.keyLeft,
          this.keyRight,
          dt
        );
      }
      // Smooth follow toward target X
      const diff = this.cannonTargetX - this.cannon.body.x;
      if (Math.abs(diff) > 0.1) {
        const lerpSpeed = 14; // higher = snappier, ~14 means ~reachable in ~0.1s
        const newBodyX = this.cannon.body.x + diff * lerpSpeed * dt;
        this.cannon.body.x = clampCannonX(newBodyX);
        this.cannon.x = this.cannon.body.x;
      } else {
        this.cannon.body.x = this.cannonTargetX;
        this.cannon.x = this.cannonTargetX;
      }
    }

    // Timers
    this.feedbackCooldown = Math.max(0, this.feedbackCooldown - dt);
    this.gateFeedbackCooldown = Math.max(0, this.gateFeedbackCooldown - dt);
    this.redSpawnTimer -= dt;

    // Endless run state
    this.runTimeSeconds += dt;
    this.wave = calculateWave(this.runTimeSeconds);
    this.distanceMeters += calculateDistanceDelta(this.runTimeSeconds, dt);
    this.score = calculateScore(this.distanceMeters, this.kills, this.checkpointsDestroyed);

    // Live best tracking — update session fields directly to avoid per-frame localStorage reads
    const distFloor = Math.floor(this.distanceMeters);
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      saveBestScore(this.bestScore);
    }
    if (distFloor > this.bestDistance) {
      this.bestDistance = distFloor;
      saveBestDistance(this.bestDistance);
    }

    // Dynamic red mob tuning based on wave
    const dynamicRedSpawnInterval = calculateRedSpawnInterval(this.wave);
    const dynamicRedSpeed = calculateRedSpeed(this.wave);

    // Auto-fire blue mobs from cannon
    if (this.cannon) {
      this.cannon.fireCooldown -= dt;
      if (this.cannon.fireCooldown <= 0) {
        this.spawnBlueMob();
        const baseInterval = effectiveFireInterval(this.upgradeState);
        const rapidMult = this.rapidTimer > 0 ? RAPID_FIRE_MULT : 1;
        this.cannon.fireCooldown = baseInterval / rapidMult;
      }
    }

    // Power-up timers
    if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.rapidTimer > 0) this.rapidTimer = Math.max(0, this.rapidTimer - dt);

    // Spawn power-ups
    this.powerupSpawnTimer -= dt;
    if (this.powerupSpawnTimer <= 0) {
      this.spawnPowerup();
      this.powerupSpawnTimer = POWERUP_SPAWN_INTERVAL;
    }

    // Move and check power-ups
    this.updatePowerups(dt);

    // Spawn red mobs from top
    if (this.redSpawnTimer <= 0) {
      this.spawnRedMob(dynamicRedSpeed);
      this.redSpawnTimer = dynamicRedSpawnInterval;
    }

    // Move mobs
    this.moveMobs(dt);

    // Collisions: blue vs red
    this.resolveCollisions();

    // Gate processing
    this.processGates();

    // Barrier collisions — blue mobs vs barriers
    this.checkBarrierCollisions();

    // Base damage — blue mobs reaching enemy base
    this.checkBaseDamage();

    // Check red mob reaching cannon (game over)
    this.checkCannonDanger();

    // Cleanup out-of-bounds mobs
    this.cleanupMobs();

    // Update HUD
    this.updateHud();
  }

  private clearGates(): void {
    for (const gate of this.gates) {
      gate.body.destroy();
    }
    this.gates = [];
  }

  private createLevelGates(): void {
    let nextId = 0;
    for (const def of LEVEL_1_GATES) {
      const label = def.kind === "multiply" ? `x${def.value}` : `+${def.value}`;
      const body = createGate(this, label, def.x, def.y, def.width, def.height);
      this.gates.push({
        id: nextId++,
        kind: def.kind,
        value: def.value,
        body,
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        processedMobIds: new Set(),
      });
    }
  }

  private clearBaseAndBarriers(): void {
    if (this.enemyBase) {
      this.enemyBase.body.destroy();
      this.enemyBase = null;
    }
    for (const b of this.barriers) {
      b.body.destroy();
    }
    this.barriers = [];
  }

  private createEnemyBase(): void {
    const cfg = ENEMY_BASE_CONFIG;
    const body = createEnemyBase(this, cfg.x, cfg.y, cfg.maxHp, cfg.maxHp);
    this.enemyBase = {
      body,
      x: cfg.x,
      y: cfg.y,
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
    };
  }

  private createLevelBarriers(): void {
    for (const def of LEVEL_1_BARRIERS) {
      const body = createBarrier(this, def.id, def.x, def.y, def.width, def.height, def.hp, def.maxHp);
      this.barriers.push({
        id: def.id,
        body,
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        hp: def.hp,
        maxHp: def.maxHp,
      });
    }
  }

  private processGates(): void {
    for (const gate of this.gates) {
      for (const mob of this.blueMobs) {
        if (!mob.body.active) continue;
        if (gate.processedMobIds.has(mob.id)) continue;

        const inBoundsX = Math.abs(mob.body.x - gate.x) <= gate.width / 2;
        const inBoundsY = Math.abs(mob.body.y - gate.y) <= gate.height / 2;

        if (inBoundsX && inBoundsY) {
          gate.processedMobIds.add(mob.id);

          if (gate.kind === "multiply") {
            const copies = gate.value - 1; // x2 -> 1 copy, x3 -> 2 copies
            for (let i = 0; i < copies; i++) {
              const clone = this.cloneBlueMob(mob, gate, i);
              if (clone) {
                // Mark clone as processed for this gate immediately to prevent chain reaction
                gate.processedMobIds.add(clone.id);
                this.blueMobs.push(clone);
              }
            }
          } else if (gate.kind === "add") {
            for (let i = 0; i < gate.value; i++) {
              const clone = this.cloneBlueMob(mob, gate, i);
              if (clone) {
                gate.processedMobIds.add(clone.id);
                this.blueMobs.push(clone);
              }
            }
          }

          // Throttled feedback
          if (this.gateFeedbackCooldown <= 0) {
            const feedbackLabel = gate.kind === "multiply" ? `x${gate.value}!` : `+${gate.value}!`;
            showFloatingText(this, gate.x, gate.y - gate.height / 2 - 10, feedbackLabel, "#00ffcc");
            this.gateFeedbackCooldown = 0.15;
          }
        }
      }
    }
  }

  private cloneBlueMob(source: Mob, gate: Gate, offsetIndex: number): Mob | null {
    if (this.blueMobs.length >= MOB_TUNING.maxBlueMobs) return null;

    // Spawn position: slight jitter around source, biased in velocity direction
    const spreadAngle = Phaser.Math.FloatBetween(-0.18, 0.18);
    const baseAngle = Math.atan2(source.vy, source.vx);
    const finalAngle = baseAngle + spreadAngle;

    // Speed with small jitter
    const baseSpeed = Math.hypot(source.vx, source.vy);
    const speed = baseSpeed * Phaser.Math.FloatBetween(0.88, 1.12);

    // Jittered spawn position
    const jitterX = Phaser.Math.FloatBetween(-14, 14) + offsetIndex * 8;
    const jitterY = Phaser.Math.FloatBetween(-10, 10) + (offsetIndex % 3) * 6;
    const spawnX = Phaser.Math.Clamp(source.body.x + jitterX, 40, GAME_WIDTH - 40);
    const spawnY = Phaser.Math.Clamp(source.body.y + jitterY, 40, GAME_HEIGHT - 80);

    const body = createMob(this, "blue", spawnX, spawnY);
    body.setDepth(30);

    return {
      id: this.nextMobId++,
      team: "blue",
      body,
      hp: 1,
      vx: Math.cos(finalAngle) * speed,
      vy: Math.sin(finalAngle) * speed,
    };
  }

  private resetGame(): void {
    // Clear mobs
    this.clearMobs();

    // Clear gates
    this.clearGates();

    // Clear base and barriers
    this.clearBaseAndBarriers();

    // Clear powerups
    this.clearPowerups();

    // Load upgrades
    this.upgradeState = loadUpgradeState();
    this.totalCoins = loadTotalCoins();

    // Reset state
    this.mode = "playing";
    this.kills = 0;
    this.runTimeSeconds = 0;
    this.distanceMeters = 0;
    this.score = 0;
    this.wave = 1;
    this.checkpointsDestroyed = 0;
    this.cannonLives = startingLivesFromUpgrades(this.upgradeState);
    this.nextMobId = 0;
    this.redSpawnTimer = 0.8;
    this.powerupSpawnTimer = POWERUP_SPAWN_INTERVAL;
    this.shieldTimer = 0;
    this.rapidTimer = 0;
    this.coins = 0;
    this.cannonTargetX = CANNON_X;

    // Reset keyboard movement state
    this.keyLeft = false;
    this.keyRight = false;

    // Load best from localStorage
    this.bestScore = loadBestScore();
    this.bestDistance = loadBestDistance();

    // Create cannon
    if (this.cannon) {
      this.cannon.body.destroy();
    }
    const body = createCannon(this);
    body.setPosition(CANNON_X, CANNON_Y);
    // Barrel child is at index 3 (the rect at -42)
    // Rotate barrel so it points upward by default (will be overridden by aim)
    const barrel = body.list[3] as Phaser.GameObjects.Rectangle;
    if (barrel) {
      barrel.rotation = -Math.PI / 2; // point up
    }
    this.cannon = {
      body,
      x: CANNON_X,
      y: CANNON_Y,
      angle: -Math.PI / 2,
      fireCooldown: 0.3,
    };

    // Start with cannon angle pointing straight up
    this.cannonAngle = -Math.PI / 2;

    // Hide menu UI and end overlay; show gameplay HUD
    this.hideMenuUi();
    this.hideEndOverlay();
    this.showGameplayHud();

    // Create level gates
    this.createLevelGates();

    // Create enemy base and barriers
    this.createEnemyBase();
    this.createLevelBarriers();

    this.updateHud();
  }

  private endGame(): void {
    this.mode = "gameover";
    // Finalize best
    updateBestScore(this.score, this.distanceMeters);
    this.bestScore = loadBestScore();
    this.bestDistance = loadBestDistance();

    // Award coins to total
    this.totalCoins += this.coins;
    saveTotalCoins(this.totalCoins);

    // Hide all active mobs so they don't render over/inside the gameover overlay
    for (const mob of this.blueMobs) {
      mob.body.setVisible(false);
    }
    for (const mob of this.redMobs) {
      mob.body.setVisible(false);
    }

    // Stop powerups from lingering over the overlay
    this.clearPowerups();

    this.cameras.main.shake(350, 0.012);

    // Build summary text for card
    const summaryLines = [
      `Score: ${this.score}`,
      `Distance: ${Math.floor(this.distanceMeters)}m`,
      `Wave: ${this.wave}`,
      `Checkpoints: ${this.checkpointsDestroyed}`,
      `Coins: ${this.coins}`,
    ];
    const bestLine = this.score >= this.bestScore
      ? `NEW BEST SCORE: ${this.bestScore}!`
      : `Best: ${this.bestScore}  Best Dist: ${this.bestDistance}m`;

    this.drawEndOverlay("GAME OVER", "The horde reached your cannon!");
    this.titleText.setText("GAME OVER").setVisible(true);
    this.titleText.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 115);

    // Hide upgrade shop and touch hint — not shown during gameover
    this.upgradeFireText.setVisible(false);
    this.upgradeLivesText.setVisible(false);
    this.upgradeFireBg.setVisible(false);
    this.upgradeLivesBg.setVisible(false);
    this.touchHintText.setVisible(false);

    // Subtitle becomes summary lines
    this.subtitleText.setText(summaryLines.join("   |   ")).setVisible(true);
    this.subtitleText.setFontSize("14px");
    this.subtitleText.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 74);

    // Best score line below
    this.bestScoreText.setText(bestLine).setVisible(true);
    this.bestScoreText.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 48);
    this.bestScoreText.setFontSize("13px");
    this.bestScoreText.setColor("#f0c840");

    this.promptText.setText("PLAY AGAIN").setVisible(true);
    this.promptText.y = GameScene.END_RESTART_PROMPT_Y;
    this.overlayDim.setVisible(true);
    this.endCard.setVisible(true);
    this.endPromptButton.setVisible(true);
    this.startPromptPulse();
    this.updateHud();
  }

  private winGame(): void {
    this.mode = "victory";
    this.drawEndOverlay("VICTORY!", "Base destroyed!");
    this.titleText.setText("VICTORY!").setVisible(true);
    this.titleText.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 115);
    this.subtitleText.setText("").setVisible(false);
    this.bestScoreText.setText("").setVisible(false);
    this.upgradeFireText.setVisible(false);
    this.upgradeLivesText.setVisible(false);
    this.upgradeFireBg.setVisible(false);
    this.upgradeLivesBg.setVisible(false);
    this.promptText.setText("PLAY AGAIN").setVisible(true);
    this.promptText.y = GameScene.END_RESTART_PROMPT_Y;
    this.overlayDim.setVisible(true);
    this.endCard.setVisible(true);
    this.endPromptButton.setVisible(true);
    this.startPromptPulse();
    this.updateHud();
  }

  private handleAction(): void {
    if (this.mode !== "playing") {
      this.resetGame();
    }
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (this.mode === "menu") {
      const result = resolveMenuPointer(pointer.x, pointer.y, MENU_UPGRADE_BOUNDS);
      if (result === "fire" || result === "lives") {
        this.handleUpgradeKey(result);
        return;
      }
      // "start" — pointer was not on an upgrade button
      this.resetGame();
      return;
    }
    // In playing mode: start dragging and move cannon to pointer X
    this.isDragging = true;
    this.moveCannonToX(pointer.x);
  }

  private updateAim(_pointerX: number, _pointerY: number): void {
    // Cannon angle is now locked to straight forward — no diagonal aiming.
    // This method is kept as a no-op to avoid breaking any existing call paths.
  }

  private moveCannonToX(targetX: number): void {
    if (!this.cannon) return;
    this.cannonTargetX = clampCannonX(targetX);
  }

  private spawnBlueMob(): void {
    if (this.blueMobs.length >= MOB_TUNING.maxBlueMobs) return;
    if (!this.cannon) return;
    const angle = this.cannonAngle;
    const cx = this.cannon.body.x;
    const cy = this.cannon.body.y;
    const muzzleX = cx + Math.cos(angle) * CANNON_MUZZLE_OFFSET;
    const muzzleY = cy + Math.sin(angle) * CANNON_MUZZLE_OFFSET;
    const body = createMob(this, "blue", muzzleX, muzzleY);
    body.setDepth(30);
    const mob: Mob = {
      id: this.nextMobId++,
      team: "blue",
      body,
      hp: 1,
      vx: Math.cos(angle) * MOB_TUNING.blueSpeed,
      vy: Math.sin(angle) * MOB_TUNING.blueSpeed,
    };
    this.blueMobs.push(mob);
  }

  private spawnRedMob(speed: number): void {
    if (this.redMobs.length >= MOB_TUNING.maxRedMobs) return;
    // Spawn near top of board, random X within the play area
    const laneXs = [250, 340, 430, 520, 610, 700];
    const x = laneXs[Phaser.Math.Between(0, laneXs.length - 1)];
    const y = -30;
    const body = createMob(this, "red", x, y);
    body.setDepth(28);
    // Move toward current cannon position (slight downward + lateral)
    const cannonX = this.cannon ? this.cannon.body.x : CANNON_X;
    const angleToCannon = Phaser.Math.Angle.Between(x, y, cannonX, CANNON_Y);
    const mob: Mob = {
      id: this.nextMobId++,
      team: "red",
      body,
      hp: 1,
      vx: Math.cos(angleToCannon) * speed * 0.15,
      vy: speed,
    };
    this.redMobs.push(mob);
  }

  private moveMobs(dt: number): void {
    for (const mob of this.blueMobs) {
      mob.body.x += mob.vx * dt;
      mob.body.y += mob.vy * dt;
      // Depth based on y for 2.5D
      mob.body.setDepth(Math.round(mob.body.y));
    }
    for (const mob of this.redMobs) {
      mob.body.x += mob.vx * dt;
      mob.body.y += mob.vy * dt;
      mob.body.setDepth(Math.round(mob.body.y));
    }
  }

  private resolveCollisions(): void {
    for (const blue of this.blueMobs) {
      if (!blue.body.active) continue;
      for (const red of this.redMobs) {
        if (!red.body.active) continue;
        const dist = Phaser.Math.Distance.Between(blue.body.x, blue.body.y, red.body.x, red.body.y);
        if (dist < MOB_TUNING.collisionRadius) {
          blue.body.setActive(false).setVisible(false);
          red.body.setActive(false).setVisible(false);
          this.kills += 1;
          this.coins += COIN_PER_KILL;
          showFloatingText(this, red.body.x, red.body.y, `+${COIN_PER_KILL}`, "#ffd700");
        }
      }
    }
  }

  private checkCannonDanger(): void {
    const dangerY = MOB_TUNING.cannonDangerY;
    const xRadius = MOB_TUNING.cannonDangerXRadius;
    const inGrace = this.runTimeSeconds < ENDLESS_TUNING.dangerGraceSeconds;
    const cannonX = this.cannon ? this.cannon.body.x : CANNON_X;
    for (const red of this.redMobs) {
      if (!red.body.active) continue;
      if (red.body.y >= dangerY && Math.abs(red.body.x - cannonX) < xRadius) {
        if (inGrace) {
          // During grace: remove the mob silently instead of ending the game
          red.body.setActive(false).setVisible(false);
        } else if (this.shieldTimer > 0) {
          // Shield absorbs the hit
          this.shieldTimer = 0;
          red.body.setActive(false).setVisible(false);
          showFloatingText(this, cannonX, CANNON_Y - 60, "SHIELD!", "#00eeff");
          showRingPulse(this, cannonX, CANNON_Y, 0x00eeff);
        } else {
          // Consume one life, remove the red, show feedback
          this.cannonLives -= 1;
          red.body.setActive(false).setVisible(false);
          // Show life loss near cannon (center-right area, not under HUD)
          showFloatingText(this, cannonX + 60, CANNON_Y - 60, "-1 \u2665", "#ffaaaa");
          this.cameras.main.shake(120, 0.006);
          if (this.cannonLives <= 0) {
            this.endGame();
            return;
          }
        }
      }
    }
  }

  private checkBarrierCollisions(): void {
    for (const mob of this.blueMobs) {
      if (!mob.body.active) continue;
      for (const barrier of this.barriers) {
        const inBoundsX = Math.abs(mob.body.x - barrier.x) <= barrier.width / 2;
        const inBoundsY = Math.abs(mob.body.y - barrier.y) <= barrier.height / 2;
        if (inBoundsX && inBoundsY) {
          mob.body.setActive(false).setVisible(false);
          barrier.hp -= 1;
          updateBarrierVisual(barrier.body, barrier.hp, barrier.maxHp);
          if (barrier.hp <= 0) {
            barrier.body.destroy();
            barrier.body.setActive(false).setVisible(false);
          }
          break; // mob dies on first barrier hit
        }
      }
    }
    // Remove destroyed barriers
    this.barriers = this.barriers.filter((b) => b.hp > 0);
  }

  private checkBaseDamage(): void {
    if (!this.enemyBase) return;
    const base = this.enemyBase;
    for (const mob of this.blueMobs) {
      if (!mob.body.active) continue;
      // Base hit zone: within 52px vertical of base center and within 150px horizontal
      const distY = mob.body.y - base.y;
      const distX = Math.abs(mob.body.x - base.x);
      if (distY >= -52 && distY <= 34 && distX < 150) {
        mob.body.setActive(false).setVisible(false);
        base.hp -= ENEMY_BASE_CONFIG.hitDamagePerMob;
        updateEnemyBaseVisual(base.body, base.hp, base.maxHp);
        if (this.feedbackCooldown <= 0) {
          showFloatingText(this, mob.body.x, mob.body.y - 20, "-1", "#ff6666");
          this.feedbackCooldown = 0.08;
        }
        if (base.hp <= 0) {
          this.checkpointsDestroyed += 1;
          this.coins += COIN_PER_CHECKPOINT;
          // Show checkpoint reward below HUD/base area (y=185, depth 200) to avoid obscuring top HUD
          const rewardText = this.add.text(GAME_WIDTH / 2, 185, `CHECKPOINT!  +${COIN_PER_CHECKPOINT}`, {
            fontFamily: "Arial",
            fontSize: "28px",
            color: "#ffcc00",
            fontStyle: "bold",
            stroke: "#7a3800",
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(200);
          this.tweens.add({
            targets: rewardText,
            y: 155,
            alpha: 0,
            scale: 1.2,
            duration: 900,
            ease: "Cubic.easeOut",
            onComplete: () => rewardText.destroy(),
          });
          this.cameras.main.shake(200, 0.008);
          showRingPulse(this, GAME_WIDTH / 2, 58, 0xffcc00);
          this.respawnCheckpoint();
          return;
        }
      }
    }
  }

  private respawnCheckpoint(): void {
    // Remove old base
    if (this.enemyBase) {
      this.enemyBase.body.destroy();
      this.enemyBase = null;
    }

    // Compute scaled HP
    const newMaxHp = ENDLESS_TUNING.baseHpStart + this.checkpointsDestroyed * ENDLESS_TUNING.baseHpPerCheckpoint;

    // Recreate base with scaled HP
    const body = createEnemyBase(this, ENEMY_BASE_CONFIG.x, ENEMY_BASE_CONFIG.y, newMaxHp, newMaxHp);
    this.enemyBase = {
      body,
      x: ENEMY_BASE_CONFIG.x,
      y: ENEMY_BASE_CONFIG.y,
      hp: newMaxHp,
      maxHp: newMaxHp,
    };

    // Clear gates and rebuild (reset processedMobIds so gates work again)
    this.clearGates();
    this.createLevelGates();

    // Clear barriers and rebuild with wave-scaled HP
    for (const b of this.barriers) {
      b.body.destroy();
    }
    this.barriers = [];
    const hpScale = 1 + (this.wave - 1) * ENDLESS_TUNING.barrierHpScalePerWave;
    for (const def of LEVEL_1_BARRIERS) {
      const scaledHp = Math.round(def.hp * hpScale);
      const scaledMaxHp = Math.round(def.maxHp * hpScale);
      const bbody = createBarrier(this, def.id, def.x, def.y, def.width, def.height, scaledHp, scaledMaxHp);
      this.barriers.push({
        id: def.id,
        body: bbody,
        x: def.x,
        y: def.y,
        width: def.width,
        height: def.height,
        hp: scaledHp,
        maxHp: scaledMaxHp,
      });
    }
  }

  private cleanupMobs(): void {
    const keepMob = (mob: Mob) => {
      const alive = mob.body.active && mob.body.y > -80 && mob.body.y < GAME_HEIGHT + 80;
      if (!alive) {
        mob.body.destroy();
      }
      return alive;
    };
    this.blueMobs = this.blueMobs.filter(keepMob);
    this.redMobs = this.redMobs.filter(keepMob);
  }

  private clearMobs(): void {
    for (const mob of this.blueMobs) {
      mob.body.destroy();
    }
    for (const mob of this.redMobs) {
      mob.body.destroy();
    }
    this.blueMobs = [];
    this.redMobs = [];
  }

  private drawScene(): void {
    drawWorld(this.background, this.laneGraphics, this.uiGraphics, this.scrollOffset, this.mode === "playing");
  }

  private updateHud(): void {
    if (this.mode === "playing") {
      const baseHp = this.enemyBase ? { hp: this.enemyBase.hp, maxHp: this.enemyBase.maxHp } : null;
      updatePlayingHud(
        this.hudLeftText,
        this.hudCenterText,
        this.hudRightText,
        this.livesText,
        this.powerupStatusText,
        this.cannonAngleText,
        this.score,
        this.distanceMeters,
        this.wave,
        this.checkpointsDestroyed,
        this.redMobs.length,
        this.cannonLives,
        this.shieldTimer,
        this.rapidTimer,
        baseHp
      );
      return;
    }
    clearPlayingHud(
      this.hudLeftText,
      this.hudCenterText,
      this.hudRightText,
      this.livesText,
      this.cannonAngleText,
      this.powerupStatusText
    );
  }

  private renderMenuState(): void {
    if (this.mode === "menu") {
      this.drawMenuPromptButton();
      this.drawUpgradeButtonBg("fire");
      this.drawUpgradeButtonBg("lives");
      this.upgradeFireBg.setVisible(true);
      this.upgradeLivesBg.setVisible(true);
      this.titleText.setText("MOB CANNON").setVisible(true);
      this.titleText.setPosition(GAME_WIDTH / 2, 78);
      this.subtitleText.setText("ENDLESS ARCADE SURVIVAL").setVisible(true);
      this.subtitleText.setPosition(GAME_WIDTH / 2, 126);
      // Show best score on menu
      this.bestScoreText.setPosition(GAME_WIDTH / 2, 152);
      updateMenuHud(
        {
          bestScoreText: this.bestScoreText,
          coinsText: this.coinsText,
          upgradeFireText: this.upgradeFireText,
          upgradeLivesText: this.upgradeLivesText,
          hudLeftText: this.hudLeftText,
          hudCenterText: this.hudCenterText,
          hudRightText: this.hudRightText,
          livesText: this.livesText,
          cannonAngleText: this.cannonAngleText,
          powerupStatusText: this.powerupStatusText,
        },
        { bestScoreTextX: GAME_WIDTH / 2, bestScoreTextY: 152 }
      );
      this.promptText.setText("START RUN").setVisible(true);
      this.promptText.y = GameScene.MENU_PROMPT_Y;
      this.promptButton.setVisible(true);
      this.hideEndOverlay();
      this.touchHintText.setVisible(false);
      this.startPromptPulse();
    }
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
      return;
    }
    this.scale.startFullscreen();
  }

  private spawnPowerup(): void {
    const laneXs = [280, 360, 440, 520, 600, 680];
    const x = laneXs[Phaser.Math.Between(0, laneXs.length - 1)];
    const kind: PowerupKind = Phaser.Math.Between(0, 1) === 0 ? "shield" : "rapid";
    const body = createPowerup(this, kind, x, -40);
    body.setDepth(25);
    this.powerups.push({
      id: this.nextPowerupId++,
      kind,
      body,
      x,
      y: -40,
    });
  }

  private updatePowerups(dt: number): void {
    const cannonX = this.cannon ? this.cannon.body.x : CANNON_X;
    const cannonY = this.cannon ? this.cannon.body.y : CANNON_Y;
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.y += POWERUP_FALL_SPEED * dt;
      pu.body.y = pu.y;
      // Collect when near cannon
      const dist = Phaser.Math.Distance.Between(pu.x, pu.y, cannonX, cannonY);
      if (dist < 55) {
        this.collectPowerup(pu);
        this.powerups.splice(i, 1);
        continue;
      }
      // Remove if out of bounds
      if (pu.y > GAME_HEIGHT + 60) {
        pu.body.destroy();
        this.powerups.splice(i, 1);
      }
    }
  }

  private collectPowerup(pu: Powerup): void {
    if (pu.kind === "shield") {
      this.shieldTimer = SHIELD_DURATION;
      showFloatingText(this, pu.x, pu.y, "SHIELD!", "#00eeff");
      showRingPulse(this, pu.x, pu.y, 0x00eeff);
    } else {
      this.rapidTimer = RAPID_DURATION;
      showFloatingText(this, pu.x, pu.y, "RAPID!", "#ff8800");
      showRingPulse(this, pu.x, pu.y, 0xff8800);
    }
    pu.body.destroy();
  }

  private clearPowerups(): void {
    for (const pu of this.powerups) {
      pu.body.destroy();
    }
    this.powerups = [];
  }

  private handleUpgradeKey(type: "fire" | "lives"): void {
    if (this.mode !== "menu") return;
    const ups = loadUpgradeState();
    const tc = loadTotalCoins();
    if (type === "fire") {
      if (ups.fireLevel >= UPGRADE_MAX_LEVEL) return;
      const cost = UPGRADE_FIRE_COSTS[ups.fireLevel];
      if (tc < cost) return;
      ups.fireLevel += 1;
      saveUpgradeState(ups);
      saveTotalCoins(tc - cost);
    } else {
      if (ups.livesLevel >= UPGRADE_MAX_LEVEL) return;
      const cost = UPGRADE_LIVES_COSTS[ups.livesLevel];
      if (tc < cost) return;
      ups.livesLevel += 1;
      saveUpgradeState(ups);
      saveTotalCoins(tc - cost);
    }
    this.totalCoins = loadTotalCoins();
    this.upgradeState = ups;
    this.renderMenuState();
  }

  private publishTestHooks(): void {
    const win = window as typeof window & {
      render_game_to_text: () => string;
      advanceTime: (ms: number) => void;
      debug_shop_action: (type: "fire" | "lives") => import("./game/debugHooks").ShopResult | null;
      debug_move_cannon_to_x: (x: number, ms: number) => void;
    };
    win.render_game_to_text = () => {
      const snapshot: GameDebugSnapshot = {
        note: "Origin top-left. X increases right. Y increases down. Mob Control cannon game.",
        mode: this.mode,
        cannon: this.cannon ? {
          x: Math.round(this.cannon.body.x),
          y: Math.round(this.cannon.body.y),
          angleDegrees: Math.round(Phaser.Math.RadToDeg(this.cannonAngle)),
        } : null,
        runTimeSeconds: Math.floor(this.runTimeSeconds * 100) / 100,
        distanceMeters: Math.floor(this.distanceMeters),
        score: this.score,
        wave: this.wave,
        checkpointsDestroyed: this.checkpointsDestroyed,
        cannonLives: this.cannonLives,
        blueMobCount: this.blueMobs.length,
        redMobCount: this.redMobs.length,
        kills: this.kills,
        bestScore: this.bestScore,
        bestDistance: this.bestDistance,
        coins: this.coins,
        totalCoins: this.mode === "menu" ? loadTotalCoins() : this.totalCoins,
        upgrades: this.mode === "menu" ? loadUpgradeState() : this.upgradeState,
        powerups: serializePowerups(
          this.powerups.map((p) => ({ id: p.id, kind: p.kind, x: p.x, y: p.y })),
          this.shieldTimer,
          this.rapidTimer,
        ),
        base: serializeBase(this.enemyBase),
        barriers: serializeBarriers(this.barriers),
        gates: serializeGates(this.gates),
        visible: serializeVisibleMobs(this.blueMobs, this.redMobs),
      };
      return JSON.stringify(snapshot);
    };
    win.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i += 1) {
        this.stepGame(1 / 60);
      }
    };
    win.debug_shop_action = (type: "fire" | "lives") => {
      if (this.mode !== "menu") return null;
      this.handleUpgradeKey(type);
      return {
        totalCoins: this.totalCoins,
        upgrades: this.upgradeState,
        mode: this.mode,
      };
    };
    win.debug_move_cannon_to_x = (x: number, ms: number) => {
      this.moveCannonToX(x);
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i += 1) {
        this.stepGame(1 / 60);
      }
    };
  }
}

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#5dbb63",
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
