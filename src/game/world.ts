import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, LANES, LANE_CENTER } from "./config";
import { projectX } from "./projection";

export function drawWorld(
  background: Phaser.GameObjects.Graphics,
  laneGraphics: Phaser.GameObjects.Graphics,
  uiGraphics: Phaser.GameObjects.Graphics,
  scrollOffset: number,
  showHud: boolean = true,
): void {
  background.clear();
  // Sky
  background.fillStyle(0x5ba8d4, 1);
  background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Side water zones — intentional arena margins
  background.fillStyle(0x1e5f8a, 1);
  background.fillRect(0, 0, 178, GAME_HEIGHT);
  background.fillRect(782, 0, 178, GAME_HEIGHT);

  // Soft sun-glow orbs
  background.fillStyle(0xd0eaff, 0.55);
  background.fillEllipse(90, 78, 110, 36);
  background.fillEllipse(848, 118, 140, 44);
  background.fillEllipse(122, 312, 90, 30);

  // Arena floor — green with subtle gradient bands
  background.fillStyle(0x3ea34e, 1);
  background.fillRoundedRect(175, 0, 610, GAME_HEIGHT, 26);

  drawBoardSlab(background);

  // Lane tracks — warm tan, cleaner alpha
  background.fillStyle(0xd8b16d, 0.55);
  for (const laneX of LANES) {
    drawProjectedStrip(background, laneX, 28, 514, 28, 0xd8b16d, 0.55);
  }

  // Subtle grass tufts — reduced density for less noise
  background.fillStyle(0x3da344, 0.32);
  for (let y = -76 + (scrollOffset % 76); y < GAME_HEIGHT + 80; y += 88) {
    for (let x = 232; x < 730; x += 96) {
      const projectedX = projectX(x, y);
      const width = 44 + (y / GAME_HEIGHT) * 18;
      background.fillRoundedRect(projectedX - width / 2, y, width, 28, 6);
    }
  }

  drawDecorations(background);

  laneGraphics.clear();
  // Lane guidelines — subtle white
  laneGraphics.lineStyle(3, 0xffffff, 0.22);
  for (const laneX of LANES) {
    laneGraphics.strokeLineShape(new Phaser.Geom.Line(projectX(laneX, 24), 24, projectX(laneX, 520), 520));
  }
  // Board edge — dark green border
  laneGraphics.lineStyle(5, 0x2d5229, 0.8);
  laneGraphics.strokePoints([
    new Phaser.Geom.Point(220, 26),
    new Phaser.Geom.Point(740, 26),
    new Phaser.Geom.Point(758, 502),
    new Phaser.Geom.Point(202, 502),
    new Phaser.Geom.Point(220, 26),
  ]);

  if (showHud) {
    uiGraphics.clear();
    // Single cohesive top HUD bar — dark, rounded, spans most of width
    uiGraphics.fillStyle(0x0e2433, 0.85);
    uiGraphics.fillRoundedRect(12, 12, GAME_WIDTH - 24, 52, 12);
    uiGraphics.lineStyle(2, 0x3a6080, 0.7);
    uiGraphics.strokeRoundedRect(12, 12, GAME_WIDTH - 24, 52, 12);
  }
}

function drawBoardSlab(background: Phaser.GameObjects.Graphics): void {
  background.fillStyle(0xcda55f, 1);
  background.fillPoints([
    new Phaser.Geom.Point(194, 33),
    new Phaser.Geom.Point(766, 33),
    new Phaser.Geom.Point(784, 500),
    new Phaser.Geom.Point(176, 500),
  ], true);
  background.fillStyle(0x7c5d32, 0.32);
  background.fillPoints([
    new Phaser.Geom.Point(176, 500),
    new Phaser.Geom.Point(784, 500),
    new Phaser.Geom.Point(762, 526),
    new Phaser.Geom.Point(198, 526),
  ], true);
  background.fillStyle(0x6fbf50, 1);
  background.fillPoints([
    new Phaser.Geom.Point(212, 42),
    new Phaser.Geom.Point(748, 42),
    new Phaser.Geom.Point(740, 500),
    new Phaser.Geom.Point(220, 500),
  ], true);
  background.fillStyle(0x86d666, 1);
  background.fillPoints([
    new Phaser.Geom.Point(222, 52),
    new Phaser.Geom.Point(738, 52),
    new Phaser.Geom.Point(730, 490),
    new Phaser.Geom.Point(230, 490),
  ], true);
}

function drawProjectedStrip(
  graphics: Phaser.GameObjects.Graphics,
  laneX: number,
  topY: number,
  bottomY: number,
  halfWidth: number,
  color: number,
  alpha: number,
): void {
  const topX = projectX(laneX, topY);
  const bottomX = projectX(laneX, bottomY);
  const topHalf = halfWidth * 0.66;
  const bottomHalf = halfWidth;
  graphics.fillStyle(color, alpha);
  graphics.fillPoints([
    new Phaser.Geom.Point(topX - topHalf, topY),
    new Phaser.Geom.Point(topX + topHalf, topY),
    new Phaser.Geom.Point(bottomX + bottomHalf, bottomY),
    new Phaser.Geom.Point(bottomX - bottomHalf, bottomY),
  ], true);
}

function drawDecorations(background: Phaser.GameObjects.Graphics): void {
  background.fillStyle(0x2b8440, 1);
  for (const tree of [
    { x: 225, y: 70 },
    { x: 735, y: 92 },
    { x: 230, y: 474 },
    { x: 730, y: 452 },
    { x: 250, y: 154 },
    { x: 710, y: 338 },
  ]) {
    const x = projectX(tree.x, tree.y);
    background.fillEllipse(x, tree.y, 24, 30);
    background.fillStyle(0x8b5a2b, 1);
    background.fillRect(x - 3, tree.y + 11, 6, 13);
    background.fillStyle(0x2b8440, 1);
  }

  background.fillStyle(0x4b6f85, 1);
  background.fillRoundedRect(projectX(214, 92), 92, 52, 34, 7);
  background.fillStyle(0xffd85d, 1);
  background.fillTriangle(projectX(214, 92), 92, projectX(240, 72), 72, projectX(266, 92), 92);
  background.fillStyle(0x5d7e95, 1);
  background.fillRoundedRect(projectX(695, 388), 388, 44, 32, 7);
  background.fillStyle(0xffffff, 0.75);
  background.fillRect(projectX(706, 397), 397, 8, 10);
  background.fillRect(projectX(722, 397), 397, 8, 10);
}
