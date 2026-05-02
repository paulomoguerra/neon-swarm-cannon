import Phaser from "phaser";

export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = "#ffffff",
): void {
  const label = scene.add.text(x, y, text, {
    fontFamily: "Arial",
    fontSize: "19px",
    color,
    fontStyle: "bold",
    stroke: "#203044",
    strokeThickness: 4,
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: label,
    y: y - 42,
    alpha: 0,
    scale: 1.12,
    duration: 520,
    ease: "Cubic.easeOut",
    onComplete: () => label.destroy(),
  });
}

export function showRingPulse(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffffff,
): void {
  const ring = scene.add.circle(x, y, 18, color, 0.18);
  ring.setStrokeStyle(4, color, 0.85);
  scene.tweens.add({
    targets: ring,
    alpha: 0,
    scale: 2.2,
    duration: 420,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy(),
  });
}
