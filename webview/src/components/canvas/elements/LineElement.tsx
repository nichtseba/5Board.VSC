import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function LineElement({ element }: EditorElementProps<EditorElementType.Line>) {
  const { width, height } = element.layout;
  const { points, headTypeStart = 'none', headTypeEnd = 'none', headFill = true } = element.data;

  const { color, border } = element.style;

  if (points.length < 2) {
    return null;
  }

  const [start, end] = [points[0], points[1]];

  const x1 = (start.x / 100) * width;
  const y1 = (start.y / 100) * height;
  const x2 = (end.x / 100) * width;
  const y2 = (end.y / 100) * height;

  const strokeDasharray =
    border?.style === 'dashed' ? '5,5' : border?.style === 'dotted' ? '2,3' : undefined;

  const markerStart = headTypeStart !== 'none' ? `url(#${element.id}-start)` : undefined;
  const markerEnd = headTypeEnd !== 'none' ? `url(#${element.id}-end)` : undefined;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {headTypeStart !== 'none' && (
          <marker
            id={`${element.id}-start`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={headFill ? color : 'none'} stroke={color} />
          </marker>
        )}

        {headTypeEnd !== 'none' && (
          <marker
            id={`${element.id}-end`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={headFill ? color : 'none'} stroke={color} />
          </marker>
        )}
      </defs>

      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={border?.width}
        strokeDasharray={strokeDasharray}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
    </svg>
  );
}
