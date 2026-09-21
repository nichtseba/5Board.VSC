export type Point = { x: number; y: number };
export type Metrics = { width: number; height: number };

// Angle increment the shift-snap constrains to (15° blocks).
export const SNAP_ANGLE = Math.PI / 12;

// Snaps `end` to the nearest SNAP_ANGLE ray from `start`, projecting the cursor
// onto that ray (so the line ends closest to the cursor). Angles are computed in
// pixel space via the canvas metrics, since normalized coords may be non-square.
export function snapToAngle(start: Point, end: Point, metrics: Metrics): Point {
  const dxPx = (end.x - start.x) * metrics.width;
  const dyPx = (end.y - start.y) * metrics.height;
  const snapAngle = Math.round(Math.atan2(dyPx, dxPx) / SNAP_ANGLE) * SNAP_ANGLE;
  const proj = dxPx * Math.cos(snapAngle) + dyPx * Math.sin(snapAngle);
  return {
    x: start.x + (Math.cos(snapAngle) * proj) / metrics.width,
    y: start.y + (Math.sin(snapAngle) * proj) / metrics.height,
  };
}

// Pixel distance between two normalized points via the canvas metrics.
export function distPx(a: Point, b: Point, metrics: Metrics): number {
  return Math.hypot((a.x - b.x) * metrics.width, (a.y - b.y) * metrics.height);
}
