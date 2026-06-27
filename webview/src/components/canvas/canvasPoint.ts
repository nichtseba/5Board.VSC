// Converts a canvas pointer event into a normalized (0–1) position relative to the
// editor canvas. Shared by every canvas feature that needs a position (cursor
// mirroring, freehand, …) so the rect math is defined once.
//
// Normalized coordinates are resolution-independent, so a point lands on the same
// spot in the editor and the (differently sized) projector.
export function canvasPointFromEvent(e: PointerEvent): { x: number; y: number } | null {
  const canvas = (e.target as HTMLElement | null)?.closest('.editor-canvas');
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
  };
}
