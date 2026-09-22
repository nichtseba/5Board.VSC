import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // Last pointer event, re-used to update the position on scroll (no pointer move).
  const lastEventRef = useRef<PointerEvent | null>(null);

  // Whether the pointer should be mirrored (tracking on AND a projector open).
  const [active, setActive] = useState(false);
  useOnMessage((msg) => {
    if (msg.type === 'projectorStateChanged') setActive(msg.active);
  });

  const sendCursor = useCallback(
    (e: PointerEvent) => {
      if (!active || rafRef.current !== null) return;
      const point = calculateCanvasPoint(e);
      if (!point) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        messages.send({ type: 'cursorMove', x: point.x, y: point.y });
      });
    },
    [active, calculateCanvasPoint, messages],
  );

  // Push the last known position as soon as mirroring turns on again, so resuming
  // does not wait for the next pointer move. Kept in a ref so the effect only runs
  // on the active flag, not on every sendCursor identity change.
  const sendCursorRef = useRef(sendCursor);
  sendCursorRef.current = sendCursor;
  useEffect(() => {
    if (active && lastEventRef.current) sendCursorRef.current(lastEventRef.current);
  }, [active]);

  // Memoized so the hub subscribes once (a new object each render would re-subscribe
  // the scroll listener every render, like ProjectorScrollMirror avoids).
  const handlers = useMemo(
    () => ({
      pointerMove: (e: PointerEvent) => {
        lastEventRef.current = e;
        sendCursor(e);
      },
      // Scrolling moves the canvas under a stationary pointer: recompute from the
      // last event (its rect is now updated) so the mirrored cursor follows.
      scroll: () => {
        if (lastEventRef.current) sendCursor(lastEventRef.current);
      },
      pointerLeave: () => {
        if (active) messages.send({ type: 'cursorLeave' });
      },
    }),
    [active, messages, sendCursor],
  );

  useCanvasEvents(handlers);

  return null;
}
