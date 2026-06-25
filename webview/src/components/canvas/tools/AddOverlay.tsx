export type AddOverlayProps = {
  x: number;
  y: number;
};

export default function AddOverlay({ x, y }: AddOverlayProps) {
  return (
    <>
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
          width: 200,
          height: 120,
        }}
      />

      <div
        className="
          pointer-events-none
          absolute
          z-25
          rounded-md
          border
          border-editor-widget-border
          bg-editor-widget-background
          px-2
          py-1
          text-xs
          text-editor-widget-foreground
          shadow-sm
        "
        style={{
          left: x,
          top: y - 32,
        }}
      >
        Neues Element
      </div>
    </>
  );
}
