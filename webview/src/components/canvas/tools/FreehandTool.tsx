import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FREEHAND_PARAMETERS,
  EditorElement,
  EditorElementType,
  EditorToolId,
  FreehandToolParameters,
} from '5board.vsc-common';
import { useCanvasEvents, useCanvasPoint } from '../../../providers/CanvasEventsProvider';
import { useEditorState } from '../../../providers/EditorStateProvider';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useGrid } from '../../../providers/GridProvider';
import { useMessageService } from '../../../services/MessageService';
import FreehandPreviewOverlay from './FreehandPreviewOverlay';

/**
 * FreehandTool
 *
 * Active only while the FREEHAND tool is selected (mounted by CanvasTools).
 * Subscribes to the canvas event hub, captures the stroke in normalized (0–1)
 * canvas coordinates, renders a local live preview and streams it to the projector,
 * and on release commits a freehand element via 'addElement'.
 */
export default function FreehandTool() {
  const messages = useMessageService();
  const document = useBoardDocument();
  const calculateCanvasPoint = useCanvasPoint();
  const { cellSize, metrics } = useGrid();

  // Color/width come from the active tool's parameters (chosen in the sidebar).
  const tool = useEditorState()?.tool;
  const params: FreehandToolParameters =
    tool?.type === EditorToolId.FREEHAND && tool.parameters
      ? (tool.parameters as FreehandToolParameters)
      : DEFAULT_FREEHAND_PARAMETERS;

  // Normalized (0–1) points of the in-progress stroke, or null when not drawing.
  const [points, setPoints] = useState<{ x: number; y: number }[] | null>(null);
  const isDrawingRef = useRef(false);
  // Throttles preview messages to one per animation frame.
  const previewRafRef = useRef<number | null>(null);

  // Once the committed element arrives in the document, drop the lingering preview
  // so the real element and the preview swap without an empty frame.
  useEffect(() => {
    setPoints(null);
  }, [document]);

  const sendPreview = (pts: { x: number; y: number }[]) => {
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
      });
    });
  };

  // Turns the normalized stroke into a freehand element snapped to the grid.
  const commit = (pts: { x: number; y: number }[]) => {
    const W = metrics.width;
    const H = metrics.height;
    const spacing = cellSize.width || 1;

    // Stroke points in canvas pixels.
    const px = pts.map((p) => ({ x: p.x * W, y: p.y * H }));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Snap the bounding box outward to whole grid cells (at least one cell each).
    const xPos = Math.max(0, Math.floor(minX / spacing));
    const yPos = Math.max(0, Math.floor(minY / spacing));
    const width = Math.max(1, Math.ceil(maxX / spacing) - xPos);
    const height = Math.max(1, Math.ceil(maxY / spacing) - yPos);

    // Normalize points to 0..1 within the grid box so they map back to the exact
    // pixels on commit (no shift/stretch) and scale correctly in the projector.
    const boxLeft = xPos * spacing;
    const boxTop = yPos * spacing;
    const boxW = width * spacing;
    const boxH = height * spacing;
    const normalized = px.map((p) => ({ x: (p.x - boxLeft) / boxW, y: (p.y - boxTop) / boxH }));

    const element: EditorElement<EditorElementType.Freehand> = {
      id: crypto.randomUUID(),
      type: EditorElementType.Freehand,
      layout: { xPos, yPos, width, height },
      style: { visible: true, opacity: params.opacity },
      data: {
        strokes: [
          {
            points: normalized,
            color: params.color,
            width: params.width,
            lineStyle: params.lineStyle,
            dashScale: params.dashScale,
          },
        ],
      },
    };
    messages.send({ type: 'addElement', element });
  };

  useCanvasEvents(
    useMemo(
      () => ({
        pointerDown: (event) => {
          event.preventDefault();
          const point = calculateCanvasPoint(event);
          if (!point) return;
          isDrawingRef.current = true;
          setPoints([point]);
        },
        pointerMove: (event) => {
          if (!isDrawingRef.current) return;
          const point = calculateCanvasPoint(event);
          if (!point) return;
          setPoints((prev) => {
            const next = prev ? [...prev, point] : [point];
            sendPreview(next);
            return next;
          });
        },
        pointerUp: () => {
          if (!isDrawingRef.current) return;
          isDrawingRef.current = false;
          if (previewRafRef.current !== null) {
            cancelAnimationFrame(previewRafRef.current);
            previewRafRef.current = null;
          }
          // Tell the projector the live stroke is finished (the element follows).
          messages.send({ type: 'freehandPreviewEnd' });
          setPoints((pts) => {
            if (pts && pts.length >= 2) {
              commit(pts);
              // Keep the preview until the committed element arrives (effect clears it).
              return pts;
            }
            return null;
          });
        },
        pointerCancel: () => {
          isDrawingRef.current = false;
          messages.send({ type: 'freehandPreviewEnd' });
          setPoints(null);
        },
      }),
      [messages, calculateCanvasPoint, params.color, params.width, params.opacity, params.lineStyle, params.dashScale, cellSize.width, metrics.width, metrics.height],
    ),
  );

  return (
    <FreehandPreviewOverlay
      preview={
        points
          ? {
              points,
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
