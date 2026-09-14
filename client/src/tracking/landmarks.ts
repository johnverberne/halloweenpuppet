import type { Landmark } from '@halloweenpuppet/shared';

export const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

export function toLandmarks(
  points: Array<{ x: number; y: number; z: number; visibility?: { value?: number } | number }>,
): Landmark[] {
  return points.map((point) => {
    const visibility =
      typeof point.visibility === 'number'
        ? point.visibility
        : point.visibility && typeof point.visibility === 'object'
          ? point.visibility.value
          : undefined;
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      visibility,
    };
  });
}

export function averageVisibility(
  points: Array<{ visibility?: { value?: number } | number }>,
): number {
  const values = points
    .map((point) =>
      typeof point.visibility === 'number'
        ? point.visibility
        : point.visibility && typeof point.visibility === 'object'
          ? (point.visibility.value ?? 0)
          : 0,
    )
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    return 1;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
