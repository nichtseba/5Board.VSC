import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ShapeElement({ element }: EditorElementProps<EditorElementType.Shape>) {
  const { shapeType } = element.data;

  const fillColor = element.data.fillColor ?? 'transparent';
  const strokeColor = element.data.strokeColor ?? 'var(--vscode-foreground)';
  const strokeWidth = element.data.strokeWidth ?? 3;

  return (
    <div className="shape-element flex h-full w-full items-center justify-center rounded border border-[var(--vscode-editorWidget-border)] p-2">
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {shapeType === 'rectangle' && (
          <rect
            x="10"
            y="10"
            width="80"
            height="80"
            rx={element.data.radius ?? 0}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )}

        {shapeType === 'ellipse' && (
          <ellipse
            cx="50"
            cy="50"
            rx={element.data.rx ?? 35}
            ry={element.data.ry ?? 30}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )}

        {shapeType === 'line' && (
          <line
            x1={element.data.points[0].x}
            y1={element.data.points[0].y}
            x2={element.data.points[1].x}
            y2={element.data.points[1].y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )}

        {shapeType === 'polygon' && (
          <polygon
            points={element.data.points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        )}
      </svg>
    </div>
  );
}
