import { useCallback } from 'react';
import type { ClipboardEvent, DragEvent } from 'react';
import { useMessageService } from '../../../services/MessageService';

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

  // Imports the first image file from a paste event
  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(event.clipboardData.files);
      const image = files.find((file) => file.type.startsWith('image/'));

      if (!image) {
        return;
      }

      event.preventDefault();
      void importImageFile(image);
    },
    [importImageFile],
  );

  // Allows the canvas to accept dropped files
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

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
    onPaste: handlePaste,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };
}
