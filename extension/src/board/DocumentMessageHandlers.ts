import { BoardCustomDocument } from './BoardCustomDocument';
import deepEquals from 'deep-equal';

export class DocumentMessageHandlers {
  constructor(private readonly document: BoardCustomDocument) {}

  register(): (() => void)[] {
    return [
      this.document.messageService.on('selectElement', (msg) => {
        console.log('selectElement: ', msg.id);
        this.document.applyEdit((document) => {
          if (msg.id === document.content.selectedElementId) {
            return false;
          }
          document.content.selectedElementId = msg.id;
          return true;
        });
      }),
      this.document.messageService.on('updateElementLayout', (msg) => {
        this.document.applyEdit((document) => {
          const element = document.content.elements.find((e) => e.id === msg.id);

          if (!element) {
            throw new Error(
              `Tried to update layout of element with id ${msg.id}, but it does not exist in the document`,
            );
          }
          if (deepEquals(msg.changes, element.layout)) {
            console.log("Skipping updateElementLayout message because the layout hasn't changed");
            return false;
          }
          element.layout = {
            ...element.layout,
            ...msg.changes,
          };
          return true;
        });
      }),
      this.document.messageService.on('insertSpacerRows', (msg) => {
        this.document.applyEdit((document) => {
          let changed = false;
          for (const element of document.content.elements) {
            if (element.layout.yPos >= msg.startRow) {
              element.layout = {
                ...element.layout,
                yPos: element.layout.yPos + msg.rowCount,
              };
              changed = true;
            }
          }
          return changed;
        });
      }),
      this.document.messageService.on('updateElement', (msg) => {
        this.document.applyEdit((document) => {
          const element = document.content.elements.find((e) => e.id === msg.id);
          if (!element) {
            throw new Error(
              `Tried to update element with id ${msg.id}, but it does not exist in the document`,
            );
          }
          const nextData = {
            ...element.data,
            ...msg.changes.data,
          };

          const nextLayout = {
            ...element.layout,
            ...msg.changes.layout,
          };

          if (deepEquals(nextData, element.data) && deepEquals(nextLayout, element.layout)) {
            console.log("Skipping updateElement message because the data hasn't changed");
            return false;
          }

          document.content.elements = document.content.elements.map((el) => {
            if (el.id !== msg.id) {
              return el;
            }

            return {
              ...el,
              layout: {
                ...el.layout,
                ...msg.changes.layout,
              },
              data: {
                ...el.data,
                ...msg.changes.data,
              },
            };
          });
          return true;
        });
      }),
    ];
  }
}
