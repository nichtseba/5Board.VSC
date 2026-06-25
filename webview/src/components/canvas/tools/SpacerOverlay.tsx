import { useLocalization } from '../../../providers/LocalizationProvider';

export type SpacerOverlayProps = {
  dragState: {
    currentY: number;
    draggedRows: number;
  } | null;
  canvasTop: number;
  labelTop: number;
};

export default function SpacerOverlay({ dragState, canvasTop, labelTop }: SpacerOverlayProps) {
  const { t } = useLocalization();

  if (!dragState) {
    return null;
  }

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
        style={{ top: canvasTop }}
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
        style={{ top: labelTop }}
      />
    </>
  );
}
