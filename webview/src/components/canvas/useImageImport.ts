import { useCallback, useEffect } from 'react';
import type { DragEvent } from 'react';
import { useMessageService } from '../../services/MessageService';

/*
 * Converts a browser file into byte data and sends it to the extension for import
 */
export function useImageImport() {
  const messages = useMessageService();

  const importImageFile = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));

      messages.send({
        type: 'addImageFromBytes',
        name: file.name || 'pasted-image.png',
        bytes,
      });
    },
    [messages],
  );

  useEffect(() => {
    // Imports the first image file from a paste event
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      const image = files.find((file) => file.type.startsWith('image/'));

      if (!image) {
        return;
      }

      event.preventDefault();
      void importImageFile(image);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [importImageFile]);

  // Imports the first image file from a drop event
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const files = Array.from(event.dataTransfer.files);
      const image = files.find((file) => file.type.startsWith('image/'));

      if (image) {
        void importImageFile(image);
      }
    },
    [importImageFile],
  );
  return {
    onDrop: handleDrop,
  };
}
