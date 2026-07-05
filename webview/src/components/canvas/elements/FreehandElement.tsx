import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { buildSmoothPath, dashArrayForLineStyle } from '../freehandPath';

// Virtual canvas the normalized (0..1) points are scaled into.
// A fixed viewBox lets the SVG stretch to any element size via CSS.
const VIEWBOX = 100;

/**
 * Renders a freehand drawing as an SVG with one <path> per stroke.
 *
 * `preserveAspectRatio="none"` lets the drawing stretch together with the
 * element box, while `vectorEffect="non-scaling-stroke"` keeps the pen width
 * constant in screen pixels regardless of that scaling.
 */
export function FreehandElement({ element }: EditorElementProps<EditorElementType.Freehand>) {
  const { strokes } = element.data;

  return (
    <svg
      // overflow-visible so the stroke width is not clipped at the element edges.
      className="pointer-events-none block h-full w-full overflow-visible"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="none"
      style={{ opacity: element.style.opacity ?? 1 }}
    >
      {strokes.map((stroke, index) => (
        <path
          key={index}
          d={buildSmoothPath(stroke.points.map((p) => ({ x: p.x * VIEWBOX, y: p.y * VIEWBOX })))}
          fill="none"
          stroke={stroke.color ?? 'var(--vscode-editor-foreground)'}
          strokeWidth={stroke.width ?? 2}
          strokeDasharray={dashArrayForLineStyle(stroke.lineStyle, stroke.width ?? 2, stroke.dashScale)}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
