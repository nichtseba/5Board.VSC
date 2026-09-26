import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasEvents } from '../../providers/CanvasEventsProvider';
import { useMessageService, useOnMessage } from '../../services/MessageService';

// Mirrors the editor's scroll position to the projector by subscribing to the
// canvas event hub's 'scroll' event. Only sends while a projector is open and not
// paused — both pushed from the extension via projectorStateChanged and held
// here (the consumer), like the active gating in ProjectorCursorMirror.
export default function ProjectorScrollMirror() {
  const messages = useMessageService();

  // Whether a projector window is open and whether mirroring is paused.
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  useOnMessage((msg) => {
    if (msg.type === 'projectorStateChanged') {
      setOpen(msg.open);
      setPaused(msg.paused);
    }
  });

  const sendScroll = useCallback(() => {
    if (!open || paused) return;
    // Measured live (not GridProvider's metrics, which only refresh on resize and
    // go stale while scrolled — sending a scroll-relative offset via a fresh rect
    // avoids that, same as Projector.tsx's own viewport/scroll math).
    const canvas = document.querySelector('.editor-canvas') as HTMLElement | null;
    const rect = canvas?.getBoundingClientRect();
    messages.send({
      type: 'scroll',
      top: Math.max(0, -(rect?.top ?? 0)),
      left: Math.max(0, -(rect?.left ?? 0)),
    });
  }, [open, paused, messages]);

  // Push the current position as soon as mirroring resumes, so the projector
  // catches up on any scrolling that happened while paused.
  const sendScrollRef = useRef(sendScroll);
  sendScrollRef.current = sendScroll;
  useEffect(() => {
    if (open && !paused) sendScrollRef.current();
  }, [open, paused]);

  useCanvasEvents(useMemo(() => ({ scroll: sendScroll }), [sendScroll]));

  return null;
}
