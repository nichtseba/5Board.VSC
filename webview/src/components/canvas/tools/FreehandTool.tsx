import {
  DEFAULT_FREEHAND_PARAMETERS,
  EditorToolId,
  FreehandToolParameters,
} from '5board.vsc-common';
import { useEditorState } from '../../../providers/EditorStateProvider';
import FreehandPreviewOverlay from './FreehandPreviewOverlay';
import { useFreehandDrawing } from './useFreehandDrawing';

// Mounted while the FREEHAND tool is active. Drawing logic lives in
// useFreehandDrawing; this only resolves params and renders the preview overlay.
export default function FreehandTool() {
  const tool = useEditorState()?.tool;
  const params: FreehandToolParameters =
    tool?.type === EditorToolId.FREEHAND && tool.parameters
      ? (tool.parameters as FreehandToolParameters)
      : DEFAULT_FREEHAND_PARAMETERS;

  const preview = useFreehandDrawing(params);

  return (
    <FreehandPreviewOverlay
      preview={
        preview
          ? {
              points: preview.points,
              straight: preview.straight,
              color: params.color,
              width: params.width,
              opacity: params.opacity,
              lineStyle: params.lineStyle,
              dashScale: params.dashScale,
            }
          : null
      }
    />
  );
}
