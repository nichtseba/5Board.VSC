import { EditorElementType, LineElementData } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { dashArrayForLineStyle } from '../freehandPath';

export function LineElement({ element }: EditorElementProps<EditorElementType.Line>) {
  const { width, height } = element.layout;
  const {
    points,
    headTypeStart = 'none',
    headTypeEnd = 'none',
    headSize = 6,
    headFill = true,
  } = element.data;

  const { color, border } = element.style;
  const strokeColor = border?.color ?? color ?? 'var(--vscode-editor-foreground)';
  const strokeWidth = border?.width ?? 2;

  if (points.length < 2) {
    return null;
  }

  const [start, end] = [points[0], points[1]];

  const x1 = (start.x / 100) * width;
  const y1 = (start.y / 100) * height;
  const x2 = (end.x / 100) * width;
  const y2 = (end.y / 100) * height;

  const strokeDasharray = dashArrayForLineStyle(border?.style, strokeWidth);
  const markerSize = headSize / strokeWidth;

  const markerStart = headTypeStart !== 'none' ? `url(#${element.id}-start)` : undefined;
  const markerEnd = headTypeEnd !== 'none' ? `url(#${element.id}-end)` : undefined;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {headTypeStart !== 'none' && (
          <LineMarker
            id={`${element.id}-start`}
            type={headTypeStart}
            size={markerSize}
            color={strokeColor}
            fill={headFill}
          />
        )}

        {headTypeEnd !== 'none' && (
          <LineMarker
            id={`${element.id}-end`}
            type={headTypeEnd}
            size={markerSize}
            color={strokeColor}
            fill={headFill}
          />
        )}
      </defs>

      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap={border?.style === 'dotted' ? 'round' : undefined}
        markerStart={markerStart}
        markerEnd={markerEnd}
        opacity={element.style.opacity ?? 1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

type HeadType = Exclude<LineElementData['headTypeStart'], 'none' | undefined>;

function LineMarker({
  id,
  type,
  size,
  color,
  fill,
}: {
  id: string;
  type: HeadType;
  size: number;
  color: string;
  fill: boolean;
}) {
  const length = size * 1.25;
  return (
    <marker
      id={id}
      markerWidth={length}
      markerHeight={size}
      refX={length}
      refY={size / 2}
      viewBox={`0 0 ${length} ${size}`}
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
      overflow="visible"
    >
      <HeadShape type={type} size={size} color={color} fill={fill} />
    </marker>
  );
}

function HeadShape({
  type,
  size,
  color,
  fill,
}: {
  type: HeadType;
  size: number;
  color: string;
  fill: boolean;
}) {
  const fillColor = fill ? color : 'none';
  if (type === 'circle') {
    return (
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2}
        fill={fillColor}
        stroke={color}
        strokeWidth={1}
      />
    );
  }
  if (type === 'square') {
    return <rect width={size} height={size} fill={fillColor} stroke={color} strokeWidth={1} />;
  }

  const arrowTipX = size * 1.25;
  const arrowPath = fill
    ? `M0,0 L${arrowTipX},${size / 2} L0,${size} Z`
    : `M0,0 L${arrowTipX},${size / 2} L0,${size}`;
  return (
    <path d={arrowPath} fill={fillColor} stroke={color} strokeWidth={1} strokeLinejoin="miter" />
  );
}
