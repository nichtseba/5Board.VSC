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
      // Colors via the projector-cursor theme utility; position stays inline (dynamic).
      className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-projector-cursor bg-projector-cursor/75 pointer-events-none z-[1000]"
      style={{
        left: `${cursor.x * 100}%`,
        top: `${cursor.y * 100}%`,
      }}
    />
  );
}
