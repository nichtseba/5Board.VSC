import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ArrowElement({ element }: EditorElementProps<EditorElementType.Arrow>) {
  const points = element.data.points ?? [];
  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ');
  const strokeColor = element.style?.color ?? 'var(--vscode-foreground)';
  const strokeWidth = element.style?.border?.width ?? 3;
  const markerId = `arrowhead-${element.id}`;

  return (
    <div className="arrow-element flex h-full w-full items-center justify-center rounded border border-[var(--vscode-editorWidget-border)] p-2">
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L10,3.5 L0,7 Z" fill={strokeColor} />
          </marker>
        </defs>
        {points.length >= 2 ? (
          <polyline
            points={pointString}
            fill="none"
            stroke={strokeColor}
            strokeWidth={String(strokeWidth)}
            markerEnd={`url(#${markerId})`}
          />
        ) : (
          <text
            x="50"
            y="50"
            dominantBaseline="middle"
            textAnchor="middle"
            fill="var(--vscode-descriptionForeground)"
          >
            No arrow data
          </text>
        )}
      </svg>
    </div>
  );
}
