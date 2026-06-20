// Normalized (0–1) cursor position mirrored from the editor.
export type ProjectorCursor = {
  x: number;
  y: number;
};

// Renders the live cursor dot that mirrors the editor's mouse position on the projector canvas.
export default function ProjectorMouse({ cursor }: { cursor: ProjectorCursor | null }) {
  if (!cursor) {
    return null;
  }

  return (
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
  );
}
