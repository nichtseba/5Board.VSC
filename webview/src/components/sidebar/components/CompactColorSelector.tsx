import { createPortal } from 'react-dom';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import ColorSelector, { type ColorSelectorProps } from './ColorSelector';

const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 480;

export default function CompactColorSelector(props: ColorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: POPOVER_MAX_HEIGHT });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      const popover = popoverRef.current;
      if (!rect || !popover) return;

      const viewportWidth = document.documentElement.clientWidth;
      const width = Math.min(POPOVER_WIDTH, viewportWidth - 16);
      const maxHeight = Math.min(POPOVER_MAX_HEIGHT, window.innerHeight - 16);
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 12);
      const spaceAbove = Math.max(0, rect.top - 12);
      const desiredHeight = Math.min(popover.scrollHeight, maxHeight);
      const openBelow =
        desiredHeight <= spaceBelow || (desiredHeight > spaceAbove && spaceBelow >= spaceAbove);
      const availableHeight = openBelow ? spaceBelow : spaceAbove;
      const visibleHeight = Math.min(desiredHeight, availableHeight);
      const top = openBelow ? rect.bottom + 4 : rect.top - visibleHeight - 4;

      setPosition({ left, top, maxHeight: availableHeight });
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
        className={`relative h-6 w-6 shrink-0 overflow-hidden rounded-full border ${
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
              width: Math.min(POPOVER_WIDTH, document.documentElement.clientWidth - 16),
              maxWidth: document.documentElement.clientWidth - 16,
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
