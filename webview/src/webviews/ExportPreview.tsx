import { useEffect, useState } from 'react';
import { init } from '../app/init';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { BoardDocument } from '5board.vsc-common';
import EditorCanvas from '../components/canvas/EditorCanvas';

import type { MessageService } from '../services/MessageService';

export default function ExportPreview() {
  const messages = useMessageService();
  const [document, setDocument] = useState<BoardDocument | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'initExportPreview' || msg.type === 'updateDocument') {
      setDocument(msg.document);
    }
  });

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', gap: 8, padding: 8 }}>
      <button type="button" onClick={() => void exportDocument(messages)}>
        Save HTML
      </button>

      {document ? (
        <div data-export-preview-root>
          <EditorCanvas document={document} />
        </div>
      ) : (
        <p>No preview loaded.</p>
      )}
    </div>
  );
}

// Wraps the exported canvas markup in a standalone HTML document
function createHtmlExport(body: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>5Board Export</title>
</head>
<body>
${body}
</body>
</html>`;
}

// Reads the rendered canvas from the export preview, prepares it for export and sends it to the extension
async function exportDocument(messages: MessageService): Promise<void> {
  const canvas = window.document.querySelector('[data-html-export-canvas]');

  if (!(canvas instanceof HTMLElement)) {
    return;
  }

  const exportCanvas = canvas.cloneNode(true) as HTMLElement;
  copyComputedStyles(canvas, exportCanvas);
  removeEditorOnlyState(exportCanvas);
  await inlineImageSources(exportCanvas);

  messages.send({
    type: 'htmlExportPreviewGenerated',
    html: createHtmlExport(exportCanvas.outerHTML),
    fileName: '5board-export',
  });

  messages.send({ type: 'saveHtmlExport' });
}

// Copies css styles from the rendered preview DOM to the cloned export DOM
function copyComputedStyles(source: Element, target: Element): void {
  if (source instanceof HTMLElement && target instanceof HTMLElement) {
    const computedStyle = window.getComputedStyle(source);

    for (const property of computedStyle) {
      target.style.setProperty(
        property,
        computedStyle.getPropertyValue(property),
        computedStyle.getPropertyPriority(property),
      );
    }
  }

  [...source.children].forEach((sourceChild, index) => {
    const targetChild = target.children[index];

    if (targetChild) {
      copyComputedStyles(sourceChild, targetChild);
    }
  });
}

// Removes editor-only visual state that should not appear in the exported HTML
function removeEditorOnlyState(root: HTMLElement): void {
  root.querySelectorAll('.editor-element-selected').forEach((element) => {
    element.classList.remove('editor-element-selected');
  });
}

// Converts image sources to data URLs/Base64
async function inlineImageSources(root: HTMLElement): Promise<void> {
  const images = [...root.querySelectorAll('img')];

  await Promise.all(
    images.map(async (image) => {
      const src = image.getAttribute('src');

      if (!src || src.startsWith('data')) {
        return;
      }

      const response = await fetch(src);
      const blob = await response.blob();

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result)));
        reader.addEventListener('error', () => reject(reader.error));
        reader.readAsDataURL(blob);
      });

      image.setAttribute('src', dataUrl);
    }),
  );
}

init(ExportPreview);
