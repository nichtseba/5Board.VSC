import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useGrid } from '../../../providers/GridProvider';

export function CircleElement({ element }: EditorElementProps<EditorElementType.Circle>) {
  const { width, height } = element.layout;
  const { backgroundColor, border } = element.style;
  const { cellSize } = useGrid();

  const strokeWidth = border?.width ?? 0;

  const strokeX = strokeWidth / cellSize.width;
  const strokeY = strokeWidth / cellSize.height;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2 - strokeX / 2}
        ry={height / 2 - strokeY / 2}
        fill={backgroundColor ?? 'none'}
        stroke={border?.color}
        strokeWidth={strokeWidth}
        strokeDasharray={
          border?.style === 'dashed' ? '5,5' : border?.style === 'dotted' ? '2,3' : undefined
        }
        opacity={element.style.opacity ?? 1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
