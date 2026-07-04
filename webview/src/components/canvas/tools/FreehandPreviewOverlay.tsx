import { buildSmoothPath } from '../freehandPath';

// Live, in-progress freehand stroke (normalized 0–1 to the canvas), rendered as an
// overlay on top of the canvas. Used both locally while the editor draws and on the
// projector to mirror what the editor is drawing.
export type FreehandPreview = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  opacity: number;
};

// The points are normalized to the canvas, so we scale them into a fixed viewBox and
// let the SVG stretch to the canvas size (preserveAspectRatio="none"). The stroke width
// stays constant in screen pixels via vectorEffect.
const VIEWBOX = 100;

export default function FreehandPreviewOverlay({ preview }: { preview: FreehandPreview | null }) {
  if (!preview || preview.points.length === 0) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 h-full w-full overflow-visible pointer-events-none z-[900]"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="none"
    >
      <path
        d={buildSmoothPath(preview.points.map((p) => ({ x: p.x * VIEWBOX, y: p.y * VIEWBOX })))}
        fill="none"
        stroke={preview.color}
        strokeWidth={preview.width}
        strokeOpacity={preview.opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
