import { DEFAULT_PROJECTOR_POINTER_STYLE, ProjectorPointerStyle } from '5board.vsc-common';

// Normalized (0–1) cursor position mirrored from the editor.
export type ProjectorCursor = {
  x: number;
  y: number;
};

// Renders the live cursor that mirrors the editor's mouse position on the projector canvas.
// The appearance (shape + colour + optional image) is user-configurable from the sidebar,
// so colours/images are applied inline rather than via utility classes.
export default function ProjectorMouse({
  cursor,
  style = DEFAULT_PROJECTOR_POINTER_STYLE,
}: {
  cursor: ProjectorCursor | null;
  style?: ProjectorPointerStyle;
}) {
  if (!cursor) {
    return null;
  }

  // Every shape is centered on the normalized point.
  const position = { left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` };
  const base = 'absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]';

  if (style.shape === 'duck') {
    return (
      <div className={`${base} text-2xl leading-none`} style={position}>
        🦆
      </div>
    );
  }

  // Geometric shapes: dot (filled circle), ring (outlined circle), rectangle (filled square).
  const isRing = style.shape === 'ring';
  const isRectangle = style.shape === 'rectangle';
  return (
    <div
      className={`${base} h-5 w-5 border-2 ${isRectangle ? '' : 'rounded-full'}`}
      style={{
        ...position,
        borderColor: style.color,
        backgroundColor: isRing ? 'transparent' : `color-mix(in srgb, ${style.color} 75%, transparent)`,
      }}
    />
  );
}
