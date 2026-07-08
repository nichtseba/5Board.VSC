import { useMemo } from 'react';
import { useCanvasEvents } from '../../providers/CanvasEventsProvider';
import { useMessageService } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';

// Mirrors the editor's scroll position to the projector by subscribing to the
// canvas event hub's 'scroll' event. Rendered only while a projector is open, so
// the hub attaches its window scroll listener only then (gated at the source,
// like ProjectorCursorMirror).
export default function ProjectorScrollMirror() {
  const messages = useMessageService();
  const { metrics } = useGrid();

  useCanvasEvents(
    useMemo(
      () => ({
        scroll: () => {
          messages.send({
            type: 'scroll',
            top: Math.max(0, window.scrollY - metrics.top),
            left: Math.max(0, window.scrollX - metrics.left),
          });
        },
      }),
      [messages, metrics.top, metrics.left],
    ),
  );

  return null;
}
