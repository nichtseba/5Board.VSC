import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { BoardDocument, BoardElement, EditorElementType } from '5board.vsc-common';
import EditorElement from './EditorElement';
import { buildSmoothPath } from './freehandPath';
import './EditorCanvas.css';

// Fallback column count if the CSS variable cannot be read.
const FALLBACK_COLUMNS = 40;

/** Reads the grid column count from the canvas' --editor-columns CSS variable. */
function getColumns(el: HTMLElement): number {
  const value = parseInt(getComputedStyle(el).getPropertyValue('--editor-columns'), 10);
  return Number.isFinite(value) && value > 0 ? value : FALLBACK_COLUMNS;
}

export type EditorCanvasProps = {
  document: BoardDocument;
  // Called with normalized (0–1) canvas coordinates on mouse move.
  // Only the editor provides this; pass undefined to disable mouse tracking entirely.
  onCursorMove?: (x: number, y: number) => void;
  // Called when the mouse leaves the canvas area.
  // Editor uses this to send 'cursorLeave' so the projector hides the dot.
  onCursorLeave?: () => void;
  // Called when the user clicks an element.
  // Editor uses this to send 'selectElement' to the extension.
  onElementSelect?: (id: string | null) => void;
  // Normalized (0–1) cursor position to display as a live overlay.
  // Only the projector passes this to mirror the editor's mouse position.
  cursor?: { x: number; y: number } | null;
  // Externally controlled selected element ID (projector only).
  // When provided (even as null), this overrides the internal click-selection state.
  selectedElementId?: string | null;
  // When true, a drawing overlay is shown so the user can draw a freehand stroke.
  freehandActive?: boolean;
  // Color and width the freehand stroke is drawn with (chosen in the sidebar).
  freehandColor?: string;
  freehandWidth?: number;
  // Called with a finished freehand element so the editor can add it to the document.
  onAddElement?: (element: BoardElement) => void;
  // Called while drawing with the live stroke in normalized (0–1) canvas coordinates,
  // or null when the stroke ends. The editor streams this to the projector.
  onFreehandPreview?: (
    points: { x: number; y: number }[] | null,
    color: string,
    width: number,
  ) => void;
  // A live freehand preview to render read-only (projector mirrors the editor here).
  freehandPreview?: { points: { x: number; y: number }[]; color: string; width: number } | null;
};

export default function EditorCanvas({
  document,
  onCursorMove,
  onCursorLeave,
  onElementSelect,
  cursor,
  selectedElementId: externalSelectedId,
  freehandActive,
  freehandColor = '#e06c75',
  freehandWidth = 4,
  onAddElement,
  onFreehandPreview,
  freehandPreview,
}: EditorCanvasProps) {
  // Internal selection state is used in the editor (externalSelectedId not provided).
  // The projector always passes externalSelectedId so it reflects the editor's selection.
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const effectiveSelectedId =
    externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  // rafRef throttles cursor messages: only one per animation frame is sent.
  const rafRef = useRef<number | null>(null);

  const handleSelect = (id: string) => {
    setInternalSelectedId(id);
    onElementSelect?.(id);
  };

  // Points of the freehand stroke shown as a local preview, in pixels relative to
  // the drawing overlay (which has the same bounds as the canvas). null = nothing.
  // It lingers after the pen is lifted until the committed element arrives in the
  // document, so there is no empty frame (flicker) in between.
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[] | null>(null);
  // Whether the pen is currently down. Separate from drawingPoints so that hover
  // moves after finishing do not keep appending points to the lingering preview.
  const isDrawingRef = useRef(false);

  // Throttles freehand preview messages to one per animation frame.
  const previewRafRef = useRef<number | null>(null);

  // Clear the lingering preview once the document updates with the committed
  // element — at that point the real element is rendered, so they swap seamlessly.
  useEffect(() => {
    setDrawingPoints(null);
  }, [document]);

  // Streams the current stroke to the projector as normalized (0–1) canvas points.
  const sendPreview = (overlay: HTMLDivElement, pts: { x: number; y: number }[]) => {
    if (!onFreehandPreview || previewRafRef.current !== null) return;
    const rect = overlay.getBoundingClientRect();
    const normalized = pts.map((p) => ({ x: p.x / rect.width, y: p.y / rect.height }));
    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = null;
      onFreehandPreview(normalized, freehandColor, freehandWidth);
    });
  };

  const handleDrawStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    setDrawingPoints([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleDrawMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || !drawingPoints) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const next = [...drawingPoints, { x: e.clientX - rect.left, y: e.clientY - rect.top }];
    setDrawingPoints(next);
    sendPreview(e.currentTarget, next);
  };

  const handleDrawEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    // Need at least two points to form a line.
    if (drawingPoints && drawingPoints.length >= 2) {
      commitStroke(e.currentTarget, drawingPoints);
    } else {
      // Too short to commit — drop the preview right away, nothing will replace it.
      setDrawingPoints(null);
    }
    // Cancel any pending preview frame so it cannot re-show the stroke after the end,
    // which would leave a stale duplicate line in the projector.
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    // Tell the projector the live stroke is finished (the final element follows).
    onFreehandPreview?.(null, freehandColor, freehandWidth);
    // Note: on a successful commit the preview is kept until the updated document
    // arrives (see the effect above), so there is no empty frame in the editor.
  };

  // Turns the drawn pixel points into a freehand element placed on the grid.
  const commitStroke = (overlay: HTMLDivElement, pts: { x: number; y: number }[]) => {
    const rect = overlay.getBoundingClientRect();
    const columns = getColumns(overlay);
    // Cells are square, so one grid cell is canvasWidth / columns pixels.
    const spacing = rect.width / columns;

    // Bounding box of the stroke in pixels.
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    // Snap the bounding box outward to whole grid cells so the element's box fully
    // contains the stroke. floor the start, ceil the end (at least one cell each).
    const xPos = Math.max(0, Math.floor(minX / spacing));
    const yPos = Math.max(0, Math.floor(minY / spacing));
    const width = Math.max(1, Math.ceil(maxX / spacing) - xPos);
    const height = Math.max(1, Math.ceil(maxY / spacing) - yPos);

    // Normalize the points to 0..1 within the *grid box* (not the tight bounding
    // box). Because the element fills exactly this grid box, every point maps back
    // to the exact pixel it was drawn at — no shifting and no stretching on commit.
    const boxLeft = xPos * spacing;
    const boxTop = yPos * spacing;
    const boxW = width * spacing;
    const boxH = height * spacing;
    const points = pts.map((p) => ({ x: (p.x - boxLeft) / boxW, y: (p.y - boxTop) / boxH }));

    const element: BoardElement = {
      id: crypto.randomUUID(),
      type: EditorElementType.Freehand,
      layout: { xPos, yPos, width, height },
      style: { visible: true },
      data: { strokes: [{ points, color: freehandColor, width: freehandWidth }] },
    };
    onAddElement?.(element);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCursorMove || rafRef.current !== null) return;

    // Coordinates are calculated relative to the canvas div itself, not the
    // full window or any outer wrapper. This keeps the position consistent
    // regardless of window size differences between editor and projector.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      onCursorMove(x, y);
    });
  };

  return (
    <>
      {/*
        position: relative is required so the absolute cursor overlay stays
        clipped inside the canvas boundaries and does not bleed outside.
      */}
      <div
        className="editor-canvas bg-editor-background"
        style={{ position: 'relative' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={onCursorLeave}
      >
        {document.content.elements.map((element) => (
          <EditorElement
            key={element.id}
            element={element}
            selected={element.id === effectiveSelectedId}
            onSelect={handleSelect}
          />
        ))}

        {/*
          Freehand drawing overlay — only active while the freehand tool is selected.
          It sits on top of the canvas, captures pointer events and shows a live
          preview of the stroke until the pointer is released.
        */}
        {freehandActive && (
          <div
            className="absolute inset-0 z-[500] cursor-crosshair"
            onPointerDown={handleDrawStart}
            onPointerMove={handleDrawMove}
            onPointerUp={handleDrawEnd}
            onPointerLeave={handleDrawEnd}
          >
            {drawingPoints && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <path
                  d={buildSmoothPath(drawingPoints)}
                  fill="none"
                  stroke={freehandColor}
                  strokeWidth={freehandWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}

        {/*
          Read-only freehand preview — the projector renders the editor's in-progress
          stroke here. Points are normalized (0–1), so a 0..1 viewBox maps them to the
          canvas; non-scaling-stroke keeps the pen width in screen pixels.
        */}
        {freehandPreview && freehandPreview.points.length > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 z-[600] h-full w-full overflow-visible"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            <path
              d={buildSmoothPath(freehandPreview.points)}
              fill="none"
              stroke={freehandPreview.color}
              strokeWidth={freehandPreview.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* Cursor overlay — only rendered in the projector via the cursor prop */}
        {cursor && (
          <div
            style={{
              position: 'absolute',
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.75)',
              border: '2px solid #dc2626',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          />
        )}
      </div>
    </>
  );
}
