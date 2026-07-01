import { useRef, useState } from 'react';
import { useCanvasEvents, useCanvasPoint } from '../../providers/CanvasEventsProvider';
import { useMessageService, useOnMessage } from '../../services/MessageService';

// Mirrors the editor's pointer position to the projector view by subscribing to the
// canvas event hub. The projector-specific gating lives here (the consumer), not in
// the generic useCanvasPointer hook: it only sends while tracking is enabled AND a
// projector window is open — both pushed from the extension via projectorStateChanged.
export default function ProjectorCursorMirror() {
  const messages = useMessageService();
  const calculateCanvasPoint = useCanvasPoint();
  // rafRef throttles position reporting: one message per animation frame.
  const rafRef = useRef<number | null>(null);

  // Whether the pointer should be mirrored (tracking on AND a projector open).
  const [active, setActive] = useState(false);
  useOnMessage((msg) => {
    if (msg.type === 'projectorStateChanged') setActive(msg.active);
  });

  useCanvasEvents({
    pointerMove: (e) => {
      if (!active || rafRef.current !== null) return;

      const point = calculateCanvasPoint(e);
      if (!point) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        messages.send({ type: 'cursorMove', x: point.x, y: point.y });
      });
    },
    pointerLeave: () => {
      if (!active) return;
      messages.send({ type: 'cursorLeave' });
    },
  });

  return null;
}
