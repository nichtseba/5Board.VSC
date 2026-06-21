import type { RefObject } from 'react';
import { useLocalization } from '../../../providers/LocalizationProvider';

export type SpacerOverlayProps = {
  dragState: {
    currentY: number;
    draggedRows: number;
  } | null;
  canvasRef: RefObject<HTMLDivElement | null>;
};

export default function SpacerOverlay({ dragState, canvasRef }: SpacerOverlayProps) {
  const { t } = useLocalization();

  if (!dragState) {
    return null;
  }

  const canvasTop = canvasRef.current?.getBoundingClientRect().top ?? 0;
  const canvasHeight = canvasRef.current?.clientHeight ?? 0;
  const top = Math.min(Math.max(12, dragState.currentY - canvasTop - 12), canvasHeight - 36);

  return (
    <>
      <div
        className="
          pointer-events-none 
          absolute 
          right-2 
          z-15 
          rounded-md 
          border 
          border-editor-widget-border
          bg-editor-widget-background
          px-2 
          py-1 
          text-xs 
          text-editor-widget-foreground
          shadow-sm"
        style={{ top }}
      >
        {t('webview.canvas.spacerLabel')}: {dragState.draggedRows >= 0 ? '+' : ''}
        {dragState.draggedRows} {t('webview.canvas.rows')}
      </div>
      <div
        className="
          pointer-events-none 
          absolute 
          z-10 
          w-full 
          border-t 
          border-dashed 
          border-focus-border"
        style={{ top: dragState.currentY - canvasTop }}
      />
    </>
  );
}
