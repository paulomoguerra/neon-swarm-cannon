import { CAMERA_PROJECTION, LANE_CENTER, SQUAD_Y } from "./config";

export function projectX(laneX: number, y: number): number {
  const depth = Math.min(1, Math.max(0, y / SQUAD_Y));
  const perspective = CAMERA_PROJECTION.topPerspective +
    depth * (CAMERA_PROJECTION.bottomPerspective - CAMERA_PROJECTION.topPerspective);
  return LANE_CENTER + (laneX - LANE_CENTER) * perspective;
}

export function projectScale(y: number): number {
  const depth = Math.min(1, Math.max(0, y / SQUAD_Y));
  return CAMERA_PROJECTION.topScale +
    depth * (CAMERA_PROJECTION.bottomScale - CAMERA_PROJECTION.topScale);
}

export function projectPoint(laneX: number, y: number): { x: number; y: number; scale: number } {
  return {
    x: projectX(laneX, y),
    y,
    scale: projectScale(y),
  };
}
