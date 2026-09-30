import { EditorElement, EditorElementType, ElementLayout, ElementStyle } from '5board.vsc-common';
import { RectangleElement } from '../../elements/RectangleElement';
import { CircleElement } from '../../elements/CircleElement';
import { LineElement } from '../../elements/LineElement';

type ClickOverlayProps = {
  elementType: EditorElementType;
  layout: ElementLayout;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  style?: Partial<ElementStyle>;
  cellSize: {
    width: number;
    height: number;
  };
};

export default function ClickOverlay({
  elementType,
  layout,
  data,
  style,
  cellSize,
}: ClickOverlayProps) {
  const element = {
    id: '__click-preview__',
    type: elementType,
    layout,
    style: style ?? {
      visible: true,
      opacity: 0.4,
      color: '#AAAAAA',
      backgroundColor: 'transparent',
      border: {
        color: '#AAAAAA',
        width: 2,
        style: 'dashed',
      },
    },
    data,
  } as EditorElement;

  const width = layout.width * cellSize.width;
  const height = layout.height * cellSize.height;

  return (
    <div
      style={{
        position: 'absolute',
        left: layout.xPos * cellSize.width,
        top: layout.yPos * cellSize.height,
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      {elementType === EditorElementType.Rectangle && (
        <RectangleElement element={element as EditorElement<EditorElementType.Rectangle>} />
      )}

      {elementType === EditorElementType.Circle && (
        <CircleElement element={element as EditorElement<EditorElementType.Circle>} />
      )}

      {elementType === EditorElementType.Line && (
        <LineElement element={element as EditorElement<EditorElementType.Line>} />
      )}
    </div>
  );
}
