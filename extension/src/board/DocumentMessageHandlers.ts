import { EXTENSION } from '../extension';
import { BoardCustomDocument } from './BoardCustomDocument';

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
      this.document.messageService.on('deleteElement', (msg) => {
        EXTENSION.deleteEditorElement(msg.id);
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
    ];
  }
}
