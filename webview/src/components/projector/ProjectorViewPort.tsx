// Projector viewport aka projector rectangle in Editor
export type ProjectorViewport = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// Renders the rectangle that mirrors the projector's visible viewport on the editor canvas.
export default function ProjectorViewPort({ viewport }: { viewport: ProjectorViewport | null }) {
  if (!viewport) {
    return null;
  }

  return (
    <div
      className="absolute border-2 pointer-events-none z-9999 border-activity-error-badge-background"
      style={{
        left: viewport.left,
        top: viewport.top,
        width: viewport.width,
        height: viewport.height,
      }}
    />
  );
}