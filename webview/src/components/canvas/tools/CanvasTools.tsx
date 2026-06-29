import { EditorToolId } from '5board.vsc-common';
import SpacerTool from './SpacerTool';
import FreehandTool from './FreehandTool';
import { useEditorState } from '../../../providers/EditorStateProvider';

/*
 * Wrapper for all Tools & Features used in the EditorCanvas.
 */

export function CanvasTools() {
  const editorState = useEditorState();

  const activeToolId = editorState?.tool.type;

  return (
    <>
      {activeToolId === EditorToolId.SPACER && <SpacerTool />}
      {activeToolId === EditorToolId.FREEHAND && <FreehandTool />}
    </>
  );
}
