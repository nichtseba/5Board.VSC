import { EditorElementType } from '5board.vsc-common';
import { BoardCustomDocument } from './BoardCustomDocument';
import { addImageToDocument } from './addImageToDocument';

export class DocumentMessageHandlers {
  constructor(private readonly document: BoardCustomDocument) {}

  register(): (() => void)[] {
    return [
      this.document.messageService.on('selectElement', (msg) => {
        console.log('selectElement: ', msg.id);
        this.document.applyEdit((document) => {
          document.content.selectedElementId = msg.id;
        });
      }),
      this.document.messageService.on('updateElementLayout', (msg) => {
        this.document.applyEdit((document) => {
          const element = document.content.elements.find((e) => e.id === msg.id);

          if (!element) {
            return;
          }

          element.layout = {
            ...element.layout,
            ...msg.changes,
          };

          if (element.type === EditorElementType.Image) {
            element.data = {
              ...element.data,
              configuredWidth: true,
            };
          }
        });
      }),
      this.document.messageService.on('insertSpacerRows', (msg) => {
        this.document.applyEdit((document) => {
          for (const element of document.content.elements) {
            if (element.layout.yPos >= msg.startRow) {
              element.layout = {
                ...element.layout,
                yPos: element.layout.yPos + msg.rowCount,
              };
            }
          }
        });
      }),
      this.document.messageService.on('addImageFromBytes', (msg) => {
        const bytes = new Uint8Array(msg.bytes);
        this.document.applyEdit((document) => {
          addImageToDocument(document, msg.name, bytes);
        });
      }),
    ];
  }
}
