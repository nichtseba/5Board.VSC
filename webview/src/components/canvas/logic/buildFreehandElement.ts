import { EditorElement, EditorElementType, FreehandToolParameters } from '5board.vsc-common';
import { Metrics, Point } from './strokeGeometry';

// Turns a normalized (0–1) stroke into a freehand element: the bounding box is
// snapped outward to whole grid cells and the points re-normalized within it.
export function buildFreehandElement(
  pts: Point[],
  params: FreehandToolParameters,
  straight: boolean,
  metrics: Metrics,
  spacing: number,
): EditorElement<EditorElementType.Freehand> {
  // Stroke points in canvas pixels.
  const px = pts.map((p) => ({ x: p.x * metrics.width, y: p.y * metrics.height }));
  const xs = px.map((p) => p.x);
  const ys = px.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  // Snap the bounding box outward to whole grid cells (at least one cell each).
  const xPos = Math.max(0, Math.floor(minX / spacing));
  const yPos = Math.max(0, Math.floor(minY / spacing));
  const width = Math.max(1, Math.ceil(maxX / spacing) - xPos);
  const height = Math.max(1, Math.ceil(maxY / spacing) - yPos);

  const boxLeft = xPos * spacing;
  const boxTop = yPos * spacing;
  const boxW = width * spacing;
  const boxH = height * spacing;
  const normalized = px.map((p) => ({ x: (p.x - boxLeft) / boxW, y: (p.y - boxTop) / boxH }));

  return {
    id: crypto.randomUUID(),
    type: EditorElementType.Freehand,
    layout: { xPos, yPos, width, height },
    style: { visible: true, opacity: params.opacity },
    display: {
      visible: true,
      excludeFromExport: false,
      speakerNote: false,
    },
    data: {
      strokes: [
        {
          points: normalized,
          color: params.color,
          width: params.width,
          lineStyle: params.lineStyle,
          dashScale: params.dashScale,
          straight,
        },
      ],
    },
  };
}
