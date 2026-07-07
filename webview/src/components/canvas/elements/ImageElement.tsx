import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useRef } from 'react';
import { useMessageService } from '../../../services/MessageService';
import { useGrid } from '../../../providers/GridProvider';

export function ImageElement({ element, assetUrls }: EditorElementProps<EditorElementType.Image>) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const messages = useMessageService();
  const { cellSize } = useGrid();

  const imageSrc = assetUrls?.[element.data.src] ?? element.data.src;

  const elementAspectRatio =
    (element.layout.width * cellSize.width) / (element.layout.height * cellSize.height);

  const aspectRatioDifference =
    element.data.aspectRatio === undefined
      ? 0
      : Math.abs(elementAspectRatio - element.data.aspectRatio) / element.data.aspectRatio;

  const objectFitClass = aspectRatioDifference > 0.1 ? 'object-contain' : 'object-fill';

  const configureSize = () => {
    if (element.data.configuredWidth && element.data.aspectRatio !== undefined) {
      return;
    }

    const img = imgRef.current;

    if (!img) {
      return;
    }

    const width = Math.max(1, Math.round(img.naturalWidth / cellSize.width));
    const height = Math.max(1, Math.round(img.naturalHeight / cellSize.height));

    const aspectRatio = img.naturalWidth / img.naturalHeight;

    messages.send({
      type: 'updateElementLayout',
      id: element.id,
      changes: {
        width,
        height,
      },
      aspectRatio,
    });
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      draggable={false}
      alt={element.data.altText ?? element.data.title ?? ''}
      title={element.data.title}
      className={
        element.data.configuredWidth === false
          ? 'overflow-hidden'
          : `w-full h-full ${objectFitClass}`
      }
      onLoad={configureSize}
    />
  );
}
