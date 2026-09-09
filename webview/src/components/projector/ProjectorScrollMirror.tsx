import { useMemo, useState } from 'react';
import { useCanvasEvents } from '../../providers/CanvasEventsProvider';
import { useMessageService, useOnMessage } from '../../services/MessageService';
import { useGrid } from '../../providers/GridProvider';

// Mirrors the editor's scroll position to the projector by subscribing to the
// canvas event hub's 'scroll' event. Only sends while a projector is open — the
// open state is pushed from the extension via projectorStateChanged and held
// here (the consumer), like the active gating in ProjectorCursorMirror.
export default function ProjectorScrollMirror() {
  const messages = useMessageService();
  const { metrics } = useGrid();

  // Whether a projector window is open (gates the scroll mirroring).
  const [open, setOpen] = useState(false);
  useOnMessage((msg) => {
    if (msg.type === 'projectorStateChanged') setOpen(msg.open);
  });

  useCanvasEvents(
    useMemo(
      () => ({
        scroll: () => {
          if (!open) return;
          messages.send({
            type: 'scroll',
            top: Math.max(0, window.scrollY - metrics.top),
            left: Math.max(0, window.scrollX - metrics.left),
          });
        },
      }),
      [open, messages, metrics.top, metrics.left],
    ),
  );

  return null;
}
