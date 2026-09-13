import { EditorElement as EditorElementData } from '5board.vsc-common';
import EditorElement from '../../EditorElement';

export type AddOverlayProps = {
  element: EditorElementData;
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function AddOverlay({ element, x, y, width, height }: AddOverlayProps) {
  return (
    <div
      className="
        pointer-events-none
        absolute
        z-20
        rounded-md
        border-2
        border-focus-border
        bg-focus-background/20
      "
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
      }}
    >
      <EditorElement element={element} preview />
    </div>
  );
}
