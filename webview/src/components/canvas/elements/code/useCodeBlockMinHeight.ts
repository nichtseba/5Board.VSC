import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EditorElement, EditorElementType } from '5board.vsc-common';
import { useGrid } from '../../../../providers/GridProvider';
import { useMessageService } from '../../../../services/MessageService';

/** Measures the block without its console and grows the element when that no longer fits. */
export function useCodeBlockMinHeight(
  element: EditorElement<EditorElementType.Code>,
  mounted: boolean,
  canGrow: boolean,
  onMinHeightChange?: (minHeight: number) => void,
) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number>();
  const { cellSize } = useGrid();
  const messages = useMessageService();

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const editorArea = editorAreaRef.current;
    const actionBar = actionBarRef.current;
    if (!mounted || !surface || !editorArea || !actionBar) return;

    const measure = () => {
      const border = surface.offsetHeight - surface.clientHeight;
      setMinHeight(editorArea.offsetHeight + actionBar.offsetHeight + border);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(editorArea);
    observer.observe(actionBar);
    return () => observer.disconnect();
  }, [mounted]);

  const { id, layout } = element;
  useEffect(() => {
    if (minHeight === undefined) return;
    onMinHeightChange?.(minHeight);

    // The grid reports 1px cells until it has been measured.
    if (!canGrow || cellSize.height <= 1) return;
    const minRows = Math.ceil(minHeight / cellSize.height);
    if (minRows > layout.height) {
      messages.send({
        type: 'updateElementsLayout',
        changes: [{ id, changes: { height: minRows } }],
      });
    }
  }, [minHeight, cellSize.height, layout.height, canGrow, id, messages, onMinHeightChange]);

  return { surfaceRef, editorAreaRef, actionBarRef };
}
