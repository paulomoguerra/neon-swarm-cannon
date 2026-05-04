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

  // Side water zones — adjusted for portrait 540-wide canvas
  background.fillStyle(0x1e5f8a, 1);
  background.fillRect(0, 0, 50, GAME_HEIGHT);
  background.fillRect(490, 0, 50, GAME_HEIGHT);

  // Soft sun-glow orbs — positioned for portrait (upper area)
  background.fillStyle(0xd0eaff, 0.55);
  background.fillEllipse(52, 50, 64, 22);
  background.fillEllipse(478, 50, 64, 22);
  background.fillEllipse(65, 180, 52, 18);

  // Arena floor — green with subtle gradient bands — portrait narrow width
  background.fillStyle(0x3ea34e, 1);
  background.fillRoundedRect(48, 0, 444, GAME_HEIGHT, 18);

  drawBoardSlab(background);

  // Lane tracks — warm tan, cleaner alpha — scaled for portrait
  background.fillStyle(0xd8b16d, 0.38);
  for (const laneX of LANES) {
    drawProjectedStrip(background, laneX, 16, 918, 16, 0xd8b16d, 0.38);
  }

  // Subtle grass tufts — reduced density by 40% for less visual noise on mobile
  background.fillStyle(0x3da344, 0.2);
  for (let y = -76 + (scrollOffset % 76); y < GAME_HEIGHT + 80; y += 136) {
    for (let x = 232; x < 730; x += 144) {
      const projectedX = projectX(x, y);
      const width = 44 + (y / GAME_HEIGHT) * 18;
      background.fillRoundedRect(projectedX - width / 2, y, width, 28, 6);
    }
  }

  drawDecorations(background);

  laneGraphics.clear();
  // Lane guidelines — subtle white — scaled for portrait
  laneGraphics.lineStyle(3, 0xffffff, 0.22);
  for (const laneX of LANES) {
    laneGraphics.strokeLineShape(new Phaser.Geom.Line(projectX(laneX, 12), 12, projectX(laneX, 950), 950));
  }
  // Board edge — dark green border — portrait-proportioned
  laneGraphics.lineStyle(5, 0x2d5229, 0.8);
  laneGraphics.strokePoints([
    new Phaser.Geom.Point(124, 14),
    new Phaser.Geom.Point(416, 14),
    new Phaser.Geom.Point(424, 906),
    new Phaser.Geom.Point(116, 906),
    new Phaser.Geom.Point(124, 14),
  ]);

  if (showHud) {
    uiGraphics.clear();
    // Single cohesive top HUD bar — dark, rounded, spans most of width — portrait narrow
    uiGraphics.fillStyle(0x0e2433, 0.72);
    uiGraphics.fillRoundedRect(12, 12, GAME_WIDTH - 24, 52, 12);
    uiGraphics.lineStyle(2, 0x3a6080, 0.7);
    uiGraphics.strokeRoundedRect(12, 12, GAME_WIDTH - 24, 52, 12);
  }
}

function drawBoardSlab(background: Phaser.GameObjects.Graphics): void {
  // Scaled for portrait canvas
  background.fillStyle(0xcda55f, 1);
  background.fillPoints([
    new Phaser.Geom.Point(54, 18),
    new Phaser.Geom.Point(486, 18),
    new Phaser.Geom.Point(494, 900),
    new Phaser.Geom.Point(46, 900),
  ], true);
  background.fillStyle(0x7c5d32, 0.32);
  background.fillPoints([
    new Phaser.Geom.Point(46, 900),
    new Phaser.Geom.Point(494, 900),
    new Phaser.Geom.Point(486, 940),
    new Phaser.Geom.Point(54, 940),
  ], true);
  background.fillStyle(0x6fbf50, 1);
  background.fillPoints([
    new Phaser.Geom.Point(58, 28),
    new Phaser.Geom.Point(482, 28),
    new Phaser.Geom.Point(474, 900),
    new Phaser.Geom.Point(66, 900),
  ], true);
  background.fillStyle(0x86d666, 1);
  background.fillPoints([
    new Phaser.Geom.Point(62, 38),
    new Phaser.Geom.Point(478, 38),
    new Phaser.Geom.Point(470, 895),
    new Phaser.Geom.Point(70, 895),
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
  // Fewer, smaller trees for portrait mobile — placed in margins, not arena
  background.fillStyle(0x2b8440, 1);
  for (const tree of [
    { x: 22, y: 220 },
    { x: 24, y: 700 },
    { x: 515, y: 400 },
  ]) {
    const x = projectX(tree.x, tree.y);
    background.fillEllipse(x, tree.y, 18, 22);
    background.fillStyle(0x8b5a2b, 1);
    background.fillRect(x - 2, tree.y + 8, 4, 10);
    background.fillStyle(0x2b8440, 1);
  }

  // Small house in lower-right margin for portrait
  background.fillStyle(0x4b6f85, 1);
  background.fillRoundedRect(projectX(495, 730), 730, 34, 22, 5);
  background.fillStyle(0xffd85d, 1);
  background.fillTriangle(projectX(495, 730), 730, projectX(512, 720), 720, projectX(529, 730), 730);
  // Small window
  background.fillStyle(0xffffff, 0.75);
  background.fillRect(projectX(505, 737), 737, 5, 6);
}
