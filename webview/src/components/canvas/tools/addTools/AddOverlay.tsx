export type AddOverlayProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  variant?: 'rectangle' | 'point';
};

export default function AddOverlay({
  x,
  y,
  width,
  height,
  variant = 'rectangle',
}: AddOverlayProps) {
  if (variant === 'point') {
    const pointSize = Math.min(width, height, 12);

    return (
      <div
        className="pointer-events-none absolute z-20 rounded-full bg-focus-border"
        style={{
          left: x + (width - pointSize) / 2,
          top: y + (height - pointSize) / 2,
          width: pointSize,
          height: pointSize,
        }}
      />
    );
  }

  return (
    <div
      className="
        pointer-events-none
        absolute
        z-20
        rounded-md
        border-2
        border-focus-border
        bg-focus-background/20
      "
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
      }}
    />
  );
}
