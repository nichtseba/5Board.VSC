import { EditorElement as EditorElementData } from '5board.vsc-common';
import EditorElement from '../../EditorElement';
import { useGrid } from '../../../../providers/GridProvider';

export type AddOverlayProps = {
  element: EditorElementData;
};

export default function AddOverlay({ element }: AddOverlayProps) {
  const { cellSize } = useGrid();

  return (
    <div
      className="
        pointer-events-none
        absolute
        z-20
        box-border
        overflow-hidden
        rounded-md
        border-2
        border-focus-border
        bg-focus-background/20
      "
      style={{
        left: element.layout.xPos * cellSize.width,
        top: element.layout.yPos * cellSize.height,
        width: element.layout.width * cellSize.width,
        height: element.layout.height * cellSize.height,
      }}
    >
      <EditorElement element={element} preview />
    </div>
  );
}
