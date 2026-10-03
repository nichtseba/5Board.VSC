import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';
import ColorSelector, { type ColorSelectorProps } from './ColorSelector';

const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 480;

export default function CompactColorSelector(props: ColorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: POPOVER_MAX_HEIGHT });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
      const maxHeight = Math.min(POPOVER_MAX_HEIGHT, window.innerHeight - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow >= maxHeight + 8 ? rect.bottom + 4 : Math.max(8, rect.top - maxHeight - 4);

      setPosition({ left, top, maxHeight });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    updatePosition();
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className="flex min-h-6 items-center justify-between gap-2">
      {props.label && <span className="text-foreground-description">{props.label}</span>}
      <button
        ref={triggerRef}
        type="button"
        aria-label={props.label ?? 'Select color'}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={() => setIsOpen((open) => !open)}
        className={`relative h-6 w-6 shrink-0 rounded-full border ${
          isOpen ? 'ring-2 ring-focus-border border-transparent' : 'border-foreground-description'
        }`}
        style={{ backgroundColor: props.color ?? 'transparent' }}
      >
        {props.color === undefined && (
          <span className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rotate-135 bg-activity-error-badge-background" />
        )}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label={props.label ?? 'Color selector'}
            className="fixed z-9999 w-70 max-w-[calc(100vw-1rem)] overflow-y-auto rounded border border-dropdown-border bg-menu-background p-3 text-menu-foreground shadow-lg"
            style={{
              left: position.left,
              top: position.top,
              maxHeight: position.maxHeight,
            }}
          >
            <ColorSelector {...props} />
          </div>,
          document.body,
        )}
    </div>
  );
}
