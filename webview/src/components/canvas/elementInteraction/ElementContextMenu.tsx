import { useEffect, useRef } from 'react';

export type ContextMenuItem = {
  label: string;
  icon: string;
  onClick: () => void;
};

type Props = {
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
};

// Generic floating context menu, positioned at a fixed point (e.g. the right-click
// location). Closes itself on an outside click or Escape.
export default function ElementContextMenu({ position, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-9999 min-w-[180px] rounded border border-dropdown-border bg-menu-background py-1 text-menu-foreground shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-menu-selectionBackground hover:text-menu-selectionForeground"
        >
          <span className={`codicon codicon-${item.icon}`} />
          {item.label}
        </button>
      ))}
    </div>
  );
}
