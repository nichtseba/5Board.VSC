import { useEffect, useMemo, useRef, useState } from 'react';
import { FreehandToolParameters } from '5board.vsc-common';
import { useCanvasEvents, useCanvasPoint } from '../../../providers/CanvasEventsProvider';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useGrid } from '../../../providers/GridProvider';
import { useMessageService } from '../../../services/MessageService';
import { Point, distPx, snapToAngle } from '../logic/strokeGeometry';
import { buildFreehandElement } from '../logic/buildFreehandElement';

export type DrawingPreview = { points: Point[]; straight: boolean };

// Freehand drawing state machine. Shift draws straight segments (drag snaps to 15°, clicks connect exact points); the stroke finishes on release-Shift/Enter/plain pointer-up. Returns the live preview for the local overlay.
export function useFreehandDrawing(params: FreehandToolParameters): DrawingPreview | null {
  const messages = useMessageService();
  const document = useBoardDocument();
  const calculateCanvasPoint = useCanvasPoint();
  const { cellSize, metrics } = useGrid();

  const [preview, setPreview] = useState<DrawingPreview | null>(null);
  const previewRafRef = useRef<number | null>(null);

  // In-progress stroke state (refs so the window keyboard handlers see current values).
  const strokeRef = useRef<Point[] | null>(null);
  const cursorRef = useRef<Point | null>(null);
  const pointerDownRef = useRef(false);
  const shiftDownRef = useRef(false);
  const hasShiftRef = useRef(false); // any straight (shift) segment → render the whole stroke sharp
  const downPointRef = useRef<Point | null>(null); // pointer-down position, to detect a drag
  const movedRef = useRef(false); // pointer moved while down → drag (snaps to angles)

  // Drop the lingering preview once the committed element arrives.
  useEffect(() => {
    setPreview(null);
  }, [document]);

  const sendPreview = (pts: Point[], straight: boolean) => {
    if (previewRafRef.current !== null) return;
    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = null;
      messages.send({
        type: 'freehandPreview',
        points: pts,
        color: params.color,
        width: params.width,
        opacity: params.opacity,
        lineStyle: params.lineStyle,
        dashScale: params.dashScale,
        straight,
      });
    });
  };

  const commit = (pts: Point[], straight: boolean) => {
    const element = buildFreehandElement(pts, params, straight, metrics, cellSize.width || 1);
    messages.send({ type: 'addFreehandElement', element });
  };

  const cancelPreviewRaf = () => {
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
  };

  // Snapped end point while dragging; exact cursor for clicks.
  const provisionalPoint = (last: Point, cur: Point): Point =>
    pointerDownRef.current && movedRef.current ? snapToAngle(last, cur, metrics) : cur;

  // Build the current preview from the confirmed stroke plus the live segment.
  const buildPreview = (): DrawingPreview | null => {
    const stroke = strokeRef.current;
    if (!stroke) return null;
    const cur = cursorRef.current;
    let pts = stroke;
    if (cur && stroke.length && (shiftDownRef.current || !pointerDownRef.current)) {
      pts = [...stroke, provisionalPoint(stroke[stroke.length - 1], cur)];
    }
    // Any Shift segment → render the whole stroke sharp (no smoothing).
    return { points: pts, straight: hasShiftRef.current || shiftDownRef.current };
  };

  const refreshPreview = () => {
    const pv = buildPreview();
    setPreview(pv);
    if (pv) sendPreview(pv.points, pv.straight);
  };

  const resetStroke = () => {
    strokeRef.current = null;
    cursorRef.current = null;
    pointerDownRef.current = false;
    shiftDownRef.current = false;
    hasShiftRef.current = false;
    cancelPreviewRaf();
  };

  const finalize = () => {
    const stroke = strokeRef.current;
    const straight = hasShiftRef.current;
    resetStroke();
    messages.send({ type: 'freehandPreviewEnd' });
    if (stroke && stroke.length >= 2) {
      commit(stroke, straight);
      // Keep the preview until the committed element arrives (document effect clears it).
    } else {
      setPreview(null);
    }
  };

  const cancelStroke = () => {
    resetStroke();
    messages.send({ type: 'freehandPreviewEnd' });
    setPreview(null);
  };

  const handleDown = (point: Point, shift: boolean) => {
    // Click without Shift on an open pen line finishes it.
    if (strokeRef.current && !pointerDownRef.current && !shift) {
      finalize();
      return;
    }
    pointerDownRef.current = true;
    shiftDownRef.current = shift;
    movedRef.current = false;
    downPointRef.current = point;
    cursorRef.current = point;
    if (!strokeRef.current) {
      strokeRef.current = [point];
      hasShiftRef.current = false;
    }
    refreshPreview();
  };

  const handleMove = (point: Point, shift: boolean) => {
    cursorRef.current = point;
    const stroke = strokeRef.current;
    if (!stroke) return;
    if (pointerDownRef.current) {
      // A move beyond a small threshold makes this a drag (enables angle snapping).
      if (
        !movedRef.current &&
        downPointRef.current &&
        distPx(point, downPointRef.current, metrics) > 3
      ) {
        movedRef.current = true;
      }
      if (shift) {
        shiftDownRef.current = true; // provisional straight segment (computed in preview)
      } else {
        // Shift just released mid-drag: freeze the straight endpoint, then draw freehand.
        let base = stroke;
        if (shiftDownRef.current) {
          const placed = provisionalPoint(stroke[stroke.length - 1], point);
          base =
            distPx(placed, stroke[stroke.length - 1], metrics) > 1 ? [...stroke, placed] : stroke;
          shiftDownRef.current = false;
          hasShiftRef.current = true; // the frozen segment is straight
        }
        strokeRef.current = [...base, point];
      }
    } else {
      // Shift released while pointer up → finish (keyup fallback).
      if (!shift) {
        finalize();
        return;
      }
      shiftDownRef.current = shift; // hover preview
    }
    refreshPreview();
  };

  const handleUp = (shift: boolean) => {
    const stroke = strokeRef.current;
    if (!stroke) {
      pointerDownRef.current = false;
      return;
    }
    if (shift) {
      // Place an anchor; keep the stroke open until Shift/Enter finishes it.
      const cur = cursorRef.current ?? stroke[stroke.length - 1];
      const placed = provisionalPoint(stroke[stroke.length - 1], cur);
      pointerDownRef.current = false;
      if (distPx(placed, stroke[stroke.length - 1], metrics) > 1) {
        strokeRef.current = [...stroke, placed];
      }
      shiftDownRef.current = true;
      hasShiftRef.current = true; // this stroke uses straight segments
      refreshPreview();
    } else {
      finalize();
    }
  };

  // Fresh refs so the once-mounted pointer/keyboard handlers use current closures.
  const handleDownRef = useRef<(p: Point, shift: boolean) => void>(() => {});
  const handleMoveRef = useRef<(p: Point, shift: boolean) => void>(() => {});
  const handleUpRef = useRef<(shift: boolean) => void>(() => {});
  const refreshPreviewRef = useRef<() => void>(() => {});
  const finalizeRef = useRef<() => void>(() => {});
  const cancelStrokeRef = useRef<() => void>(() => {});
  const provisionalPointRef = useRef<(last: Point, cur: Point) => Point>((_, cur) => cur);
  handleDownRef.current = handleDown;
  handleMoveRef.current = handleMove;
  handleUpRef.current = handleUp;
  refreshPreviewRef.current = refreshPreview;
  finalizeRef.current = finalize;
  cancelStrokeRef.current = cancelStroke;
  provisionalPointRef.current = provisionalPoint;

  // Enter commits, Escape cancels; releasing Shift finishes a pen line or, mid-drag,
  // freezes the straight part and continues freehand.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftDownRef.current = true;
        if (strokeRef.current && !pointerDownRef.current) refreshPreviewRef.current();
        return;
      }
      if (!strokeRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        finalizeRef.current();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelStrokeRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return;
      shiftDownRef.current = false;
      const stroke = strokeRef.current;
      if (!stroke) return;
      if (pointerDownRef.current) {
        // Freeze the (snapped if dragged) endpoint; subsequent moves continue freehand.
        const cur = cursorRef.current;
        if (cur) {
          const last = stroke[stroke.length - 1];
          const placed = provisionalPointRef.current(last, cur);
          if (distPx(placed, last, metrics) > 1) strokeRef.current = [...stroke, placed];
        }
        hasShiftRef.current = true; // the frozen segment is straight
        refreshPreviewRef.current();
      } else {
        // Pen mode: releasing Shift finishes the line immediately.
        finalizeRef.current();
      }
    };
    // window + document (capture) so keyup is caught regardless of focus.
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.document.addEventListener('keydown', onKeyDown, true);
    window.document.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.document.removeEventListener('keydown', onKeyDown, true);
      window.document.removeEventListener('keyup', onKeyUp, true);
    };
  }, [metrics.width, metrics.height]);

  useCanvasEvents(
    useMemo(() => {
      // Clamp horizontally to the canvas but let the stroke run past the bottom
      // edge, so drawing below the grid keeps tracking (downward only).
      const clamp = (p: Point): Point => ({
        x: Math.min(1, Math.max(0, p.x)),
        y: Math.max(0, p.y),
      });
      return {
        pointerDown: (event) => {
          const point = calculateCanvasPoint(event);
          if (!point) return;
          event.preventDefault();
          // Capture the pointer so moves/up keep arriving once it leaves the canvas.
          const canvas = (event.target as Element | null)?.closest('.editor-canvas');
          (canvas as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
          handleDownRef.current(clamp(point), event.shiftKey);
        },
        pointerMove: (event) => {
          const point = calculateCanvasPoint(event);
          if (!point) return;
          handleMoveRef.current(clamp(point), event.shiftKey);
        },
        pointerUp: (event) => {
          handleUpRef.current(event.shiftKey);
        },
        pointerCancel: () => {
          cancelStrokeRef.current();
        },
      };
    }, [calculateCanvasPoint]),
  );

  return preview;
}
