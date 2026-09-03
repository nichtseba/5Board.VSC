import { EXTENSION } from '../extension';
import { BoardCustomDocument } from './BoardCustomDocument';
import deepEquals from 'deep-equal';

export class DocumentMessageHandlers {
  constructor(private readonly document: BoardCustomDocument) {}
  register(): (() => void)[] {
    return [
      //#region "General"
      this.document.messageService.on('ready', (_msg, sender) => {
        this.document.messageService.send(
          {
            type: 'init',
            document: this.document.boardPackage.document,
            editorState: EXTENSION.editorState,
            language: 'en',
          },
          sender,
        );
        // Sync whether the pointer should currently be mirrored, so the new panel starts right.
        this.document.messageService.send(
          {
            type: 'projectorStateChanged',
            active: EXTENSION.cursorTrackingEnabled && this.document.hasProjector,
            open: this.document.hasProjector,
          },
          sender,
        );
        // Sync the mirrored cursor appearance so the projector renders it correctly.
        this.document.messageService.send(
          { type: 'projectorPointerChanged', style: EXTENSION.projectorPointerStyle },
          sender,
        );
      }),
      this.document.messageService.on('focus', ({ focus }) => {
        if (focus) {
          EXTENSION.activeEditorDocument = this.document;
        } else {
          this.document.clearActiveEditorDocument();
        }
      }),

      this.document.messageService.on('selectElement', (msg) => {
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
      //#endregion "General"

      //#region "EditorTools"

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
      this.document.messageService.on('textEditorCommand', (msg) => {
        if (!EXTENSION.activeEditorDocument) {
          return;
        }
        EXTENSION.activeEditorDocument.messageService.send(msg);
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

          const nextStyle = {
            ...element.style,
            ...msg.changes.style,
          };

          if (
            deepEquals(nextData, element.data) &&
            deepEquals(nextLayout, element.layout) &&
            deepEquals(nextStyle, element.style)
          ) {
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
              style: {
                ...el.style,
                ...msg.changes.style,
              },
            };
          });
          return true;
        });
      }),
      //#endregion "EditorTools"

      //#region "Projector"

      // The editor (ProjectorCursorMirror) only sends while mirroring is active, so just relay.
      this.document.messageService.on('cursorMove', (msg) => {
        this.document.messageService.send({ type: 'cursorMove', x: msg.x, y: msg.y });
      }),

      // When the mouse leaves the editor canvas, hide the cursor dot in the projector.
      this.document.messageService.on('cursorLeave', () => {
        this.document.messageService.send({ type: 'cursorHide' });
      }),

      // Forward scroll position from any panel to all other panels.
      // The editor only sends scroll when a projector window is open
      this.document.messageService.on('scroll', (msg) => {
        this.document.messageService.send({ type: 'scroll', top: msg.top, left: msg.left });
      }),

      this.document.messageService.on('updateViewport', (msg) => {
        this.document.messageService.send({ type: 'viewportUpdate', viewport: msg.viewport });
      }),
      //#endregion "Projector"
    ];
  }
}
