import { LineStyle } from '5board.vsc-common';

/**
 * SVG stroke-dasharray for a line style, scaled to the stroke width so the
 * pattern stays proportional. Dotted relies on a round line cap to form dots.
 * Returns undefined for solid (no dashing). Shared by the element and preview.
 */
export function dashArrayForLineStyle(
  lineStyle: LineStyle | undefined,
  width: number,
  dashScale = 3,
): string | undefined {
  if (lineStyle === 'dashed') return `${width * 3} ${width * 2}`;
  if (lineStyle === 'dotted') return `0 ${width * 2}`;
  if (lineStyle === 'custom') return `${width * dashScale} ${width * dashScale}`;
  return undefined;
}

/**
 * Builds a smooth SVG path from a stroke's points (in whatever coordinate space
 * the caller passes). Straight segments are replaced by quadratic curves through
 * the midpoints of neighbouring points, which rounds the corners so the line
 * looks hand-drawn instead of jagged.
 *
 * The same function is used for the final element AND the live drawing preview,
 * so what you see while drawing already matches the committed result.
 */
export function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';

  // A single point cannot form a line — draw a tiny dot so it stays visible.
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} l 0.01 0`;
  }

  // Start at the first point.
  let d = `M ${points[0].x} ${points[0].y}`;

  // Curve through the midpoints of consecutive segments for smoothing.
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }

  // Finish exactly on the last point.
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

/**
 * Builds a straight-segment SVG path (no smoothing) through the given points.
 * Used for pen-tool polylines where corners must stay sharp.
 */
export function buildStraightPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} l 0.01 0`;
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}
