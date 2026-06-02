import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function ImageElement({ element }: EditorElementProps<EditorElementType.Image>) {
  const { src, altText, hideInExport } = element.data;

  return (
    <figure className="image-element flex h-full w-full flex-col overflow-hidden rounded border border-[var(--vscode-editorWidget-border)] bg-[var(--vscode-editorWidget-background)]">
      <img className="h-full w-full object-cover" src={src} alt={altText ?? 'Image'} />
      <figcaption className="border-t border-[var(--vscode-editorWidget-border)] bg-[var(--vscode-editor-background)] p-2 text-xs text-[var(--vscode-descriptionForeground)]">
        {altText ?? 'Image'}
        {hideInExport ? ' • Hidden in export' : ''}
      </figcaption>
    </figure>
  );
}
