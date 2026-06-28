import { useRef } from 'react';
import { useCanvasEvents, useCanvasPoint } from '../../providers/CanvasEventsProvider';
import { useMessageService } from '../../services/MessageService';

// Mirrors the editor's pointer position to the projector view by subscribing to the
// canvas event hub. The projector-specific gating lives here (the consumer), not in
// the generic useCanvasPointer hook: it only sends while tracking is enabled AND a
// projector window is open — both pushed from the extension and held by the editor.
export default function ProjectorCursorMirror({ active }: { active: boolean }) {
  const messages = useMessageService();
  const calculateCanvasPoint = useCanvasPoint();
  // rafRef throttles position reporting: one message per animation frame.
  const rafRef = useRef<number | null>(null);

  useCanvasEvents({
    pointerMove: (e) => {
      if (!active || rafRef.current !== null) return;

      const point = calculateCanvasPoint(e);
      if (!point) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        console.log(`Mouse Position: (${point.x}, ${point.y})`); // dev tools
        messages.send({ type: 'cursorMove', x: point.x, y: point.y });
      });
    },
    pointerLeave: () => {
      if (!active) return;
      console.log('Pointer left canvas — cursorLeave'); // dev tools
      messages.send({ type: 'cursorLeave' });
    },
  });

  return null;
}
