import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function CircleElement({ element }: EditorElementProps<EditorElementType.Circle>) {
  const { width, height } = element.layout;
  const { backgroundColor, border } = element.style;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2}
        ry={height / 2}
        fill={backgroundColor}
        stroke={border?.color}
        strokeWidth={border?.width}
        strokeDasharray={
          border?.style === 'dashed' ? '5,5' : border?.style === 'dotted' ? '2,3' : undefined
        }
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
