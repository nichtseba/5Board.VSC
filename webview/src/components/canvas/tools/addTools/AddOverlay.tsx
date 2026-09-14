import { EditorElement as EditorElementData } from '5board.vsc-common';
import EditorElement from '../../EditorElement';
import { useGrid } from '../../../../providers/GridProvider';

export type AddOverlayProps = {
  element: EditorElementData;
  variant?: 'rectangle' | 'point';
};

export default function AddOverlay({ element, variant = 'rectangle' }: AddOverlayProps) {
  const { cellSize } = useGrid();
  const { left, top, width, height } = {
    left: element.layout.xPos * cellSize.width,
    top: element.layout.yPos * cellSize.height,
    width: element.layout.width * cellSize.width,
    height: element.layout.height * cellSize.height,
  };

  if (variant === 'point') {
    const pointSize = Math.min(width, height, 12);

    return (
      <div
        className="pointer-events-none absolute z-20 rounded-full bg-focus-border"
        style={{
          left: left + (width - pointSize) / 2,
          top: top + (height - pointSize) / 2,
          width: pointSize,
          height: pointSize,
        }}
      />
    );
  }

  return (
    <div
      className="
        pointer-events-none
        absolute
        z-20
        box-border
        overflow-visible
        rounded-md
        border-2
        border-focus-border
        bg-focus-background/20
      "
      style={{
        left: left,
        top: top,
        width: width,
        height: height,
      }}
    >
      <EditorElement element={element} preview />
    </div>
  );
}
