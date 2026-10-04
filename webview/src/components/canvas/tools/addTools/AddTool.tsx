import { EditorTool, EditorToolId } from '5board.vsc-common';
import { useEditorState } from '../../../../providers/EditorStateProvider';
import { DragAddTool } from './DragAddTool';
import { ClickAddTool } from './ClickAddTool';

/**
 * AddTool
 *
 * Wrapper component that delegates to the appropriate add tool based on creationMode:
 * - 'free' (default): Standard drag-drop to place element
 * - 'click': Multi-click mode (e.g., for Line elements with start/end points)
 */
export default function AddTool() {
  const editorState = useEditorState();
  const placementMode =
    (editorState.tool as EditorTool<EditorToolId.AddElement>).parameters?.placementMode || 'free';

  if (placementMode === 'click') {
    return <ClickAddTool />;
  }

  return <DragAddTool />;
}
