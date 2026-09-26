import { EditorElement as EditorElementData } from '5board.vsc-common';
import EditorElement from '../../EditorElement';
import { useGrid } from '../../../../providers/GridProvider';

export type AddOverlayProps = {
  element: EditorElementData;
};

export default function AddOverlay({ element }: AddOverlayProps) {
  const { cellSize } = useGrid();
  const { left, top, width, height } = {
    left: element.layout.xPos * cellSize.width,
    top: element.layout.yPos * cellSize.height,
    width: element.layout.width * cellSize.width,
    height: element.layout.height * cellSize.height,
  };

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
