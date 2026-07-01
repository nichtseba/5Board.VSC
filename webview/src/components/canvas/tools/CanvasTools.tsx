import { EditorToolId } from '5board.vsc-common';
import SpacerTool from './SpacerTool';
import { useEditorState } from '../../../providers/EditorStateProvider';
import AddTool from './addTools/AddTool';

/*
 * Wrapper for all Tools & Features used in the EditorCanvas.
 */

export function CanvasTools() {
  const editorState = useEditorState();

  const activeToolId = editorState?.tool.type;

  return (
    <>
      {activeToolId === EditorToolId.SPACER && <SpacerTool />}
      {activeToolId === EditorToolId.AddElement && <AddTool />}
      {/* Todo: add freehand tool here */}
    </>
  );
}
