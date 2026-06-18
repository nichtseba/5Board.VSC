import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ImageElement({ element, assetUrls }: EditorElementProps<EditorElementType.Image>) {
  const imageSrc = assetUrls?.[element.data.src] ?? element.data.src;
  return (
    <img
      className="w-full h-full"
      src={imageSrc}
      alt={element.data.altText ?? element.data.title ?? ''}
      title={element.data.title}
    />
  );
}
