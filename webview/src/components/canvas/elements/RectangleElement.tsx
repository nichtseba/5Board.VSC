import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function RectangleElement({ element }: EditorElementProps<EditorElementType.Rectangle>) {
  const { width, height } = element.layout;
  const { backgroundColor, border } = element.style;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={backgroundColor ?? 'none'}
        stroke={border?.color}
        strokeWidth={border?.width}
        rx={border?.radius}
        vectorEffect="non-scaling-stroke"
        strokeDasharray={
          border?.style === 'dashed' ? '5,5' : border?.style === 'dotted' ? '2,3' : undefined
        }
        opacity={element.style.opacity ?? 1}
      />
    </svg>
  );
}
