import SpacerTool from './SpacerTool';

/*
 * Wrapper for all Tools & Features used in the EditorCanvas.
 */

export function CanvasTools({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <>
      <SpacerTool canvasRef={canvasRef} />
    </>
  );
}
