import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, LANES } from "./config";
import { projectX } from "./projection";

export function drawWorld(
  background: Phaser.GameObjects.Graphics,
  laneGraphics: Phaser.GameObjects.Graphics,
  uiGraphics: Phaser.GameObjects.Graphics,
  scrollOffset: number,
  showHud: boolean = true,
): void {
  background.clear();
  const skyH = GAME_HEIGHT;
  background.fillStyle(0x5ba8d4, 1);
  background.fillRect(0, 0, GAME_WIDTH, skyH);

  // Side water zones — adjusted for portrait 540-wide canvas
  background.fillStyle(0x1e5f8a, 1);
  background.fillRect(0, 0, 50, skyH);
  background.fillRect(490, 0, 50, skyH);

  // Soft sun-glow orbs — positioned for portrait (upper area)
  background.fillStyle(0xd0eaff, 0.55);
  background.fillEllipse(52, 50, 64, 22);
  background.fillEllipse(478, 50, 64, 22);
  background.fillEllipse(65, 180, 52, 18);

  // Arena floor — green with subtle gradient bands — portrait narrow width
  background.fillStyle(0x3ea34e, 1);
  background.fillRoundedRect(48, 0, 444, skyH, 18);

  drawBoardSlab(background);

  // Lane tracks — warm tan, cleaner alpha — scaled for portrait
  background.fillStyle(0xd8b16d, 0.38);
  for (const laneX of LANES) {
    drawProjectedStrip(background, laneX, 16, 918, 16, 0xd8b16d, 0.38);
  }

  // Subtle side texture kept out of the active corridor read.
  background.fillStyle(0x3da344, 0.11);
  for (let y = -90 + (scrollOffset % 120); y < GAME_HEIGHT + 80; y += 180) {
    for (const x of [104, 436]) {
      const projectedX = projectX(x, y);
      const width = 28 + (y / GAME_HEIGHT) * 12;
      background.fillRoundedRect(projectedX - width / 2, y, width, 22, 6);
    }
  }

  drawDecorations(background);

  laneGraphics.clear();
  // Lane guidelines — subtle white — scaled for portrait
  laneGraphics.lineStyle(3, 0xffffff, 0.18);
  for (const laneX of LANES) {
    laneGraphics.strokeLineShape(new Phaser.Geom.Line(projectX(laneX, 12), 12, projectX(laneX, 950), 950));
  }
  // Board edge and corridor rails — stronger taper for lower-camera runway feel.
  laneGraphics.lineStyle(5, 0x1f3f2c, 0.85);
  laneGraphics.strokePoints([
    new Phaser.Geom.Point(146, 16),
    new Phaser.Geom.Point(394, 16),
    new Phaser.Geom.Point(462, 916),
    new Phaser.Geom.Point(78, 916),
    new Phaser.Geom.Point(146, 16),
  ]);
  laneGraphics.lineStyle(4, 0x12363a, 0.5);
  laneGraphics.strokeLineShape(new Phaser.Geom.Line(247, 88, 213, 898));
  laneGraphics.strokeLineShape(new Phaser.Geom.Line(293, 88, 327, 898));

  if (showHud) {
    uiGraphics.clear();
    // Single cohesive top HUD bar kept inside the mobile/desktop safe column.
    uiGraphics.fillStyle(0x0e2433, 0.72);
    uiGraphics.fillRoundedRect(56, 12, GAME_WIDTH - 112, 58, 12);
    uiGraphics.lineStyle(2, 0x3a6080, 0.7);
    uiGraphics.strokeRoundedRect(56, 12, GAME_WIDTH - 112, 58, 12);
  }
}

function drawBoardSlab(background: Phaser.GameObjects.Graphics): void {
  // Scaled for portrait canvas
  background.fillStyle(0xcda55f, 1);
  background.fillPoints([
    new Phaser.Geom.Point(116, 18),
    new Phaser.Geom.Point(424, 18),
    new Phaser.Geom.Point(512, 904),
    new Phaser.Geom.Point(28, 904),
  ], true);
  background.fillStyle(0x7c5d32, 0.32);
  background.fillPoints([
    new Phaser.Geom.Point(28, 904),
    new Phaser.Geom.Point(512, 904),
    new Phaser.Geom.Point(488, 940),
    new Phaser.Geom.Point(52, 940),
  ], true);
  background.fillStyle(0x6fbf50, 1);
  background.fillPoints([
    new Phaser.Geom.Point(124, 30),
    new Phaser.Geom.Point(416, 30),
    new Phaser.Geom.Point(492, 900),
    new Phaser.Geom.Point(48, 900),
  ], true);
  background.fillStyle(0x86d666, 1);
  background.fillPoints([
    new Phaser.Geom.Point(132, 42),
    new Phaser.Geom.Point(408, 42),
    new Phaser.Geom.Point(478, 894),
    new Phaser.Geom.Point(62, 894),
  ], true);

  // Two subtle assault corridors with a central energy trench.
  background.fillStyle(0x5bd085, 0.23);
  background.fillPoints([
    new Phaser.Geom.Point(132, 76),
    new Phaser.Geom.Point(244, 62),
    new Phaser.Geom.Point(224, 872),
    new Phaser.Geom.Point(76, 892),
  ], true);
  background.fillStyle(0x6ba7ff, 0.16);
  background.fillPoints([
    new Phaser.Geom.Point(296, 62),
    new Phaser.Geom.Point(408, 76),
    new Phaser.Geom.Point(464, 892),
    new Phaser.Geom.Point(316, 872),
  ], true);
  background.fillStyle(0x102b36, 0.42);
  background.fillPoints([
    new Phaser.Geom.Point(260, 78),
    new Phaser.Geom.Point(280, 78),
    new Phaser.Geom.Point(316, 884),
    new Phaser.Geom.Point(224, 884),
  ], true);
  background.lineStyle(3, 0x00e5ff, 0.3);
  background.strokeLineShape(new Phaser.Geom.Line(260, 84, 224, 884));
  background.strokeLineShape(new Phaser.Geom.Line(280, 84, 316, 884));
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
