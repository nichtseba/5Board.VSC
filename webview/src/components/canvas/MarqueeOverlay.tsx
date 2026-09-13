type MarqueeOverlayProps = {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

export function MarqueeOverlay({ rect }: MarqueeOverlayProps) {
  if (!rect) return null;

  return (
    <div
      className="
    absolute pointer-events-none border border-[var(--vscode-focusBorder)]"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
        backgroundColor: 'rgba(0, 120, 212, 0.08)',
      }}
    />
  );
}
