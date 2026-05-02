import { LANE_CENTER, SQUAD_Y } from "./config";

export function projectX(laneX: number, y: number): number {
  const depth = y / SQUAD_Y;
  const perspective = 0.58 + depth * 0.42;
  return LANE_CENTER + (laneX - LANE_CENTER) * perspective;
}

export function projectScale(y: number): number {
  return 0.74 + Math.min(1.15, Math.max(0, y / SQUAD_Y)) * 0.34;
}

export function projectPoint(laneX: number, y: number): { x: number; y: number; scale: number } {
  return {
    x: projectX(laneX, y),
    y,
    scale: projectScale(y),
  };
}

