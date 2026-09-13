import { EditorElement, EditorElementType, EditorToolId } from '5board.vsc-common';
import { EXTENSION } from '../extension';
import { BoardCustomDocument } from './BoardCustomDocument';
import deepEquals from 'deep-equal';
import { addImageToDocument } from './addImageToDocument';

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

      this.document.messageService.on('toggleElementSelection', (msg) => {
        this.document.applyEdit((document) => {
          let next = [...document.content.selectedElementIds];

          for (const id of msg.ids) {
            const exists = next.includes(id);

            next = exists ? next.filter((selectedId) => selectedId !== id) : [...next, id];
          }

          document.content.selectedElementIds = next;
          document.content.primarySelectedElementId = next[0] ?? null;
        });
      }),
      this.document.messageService.on('addElement', (msg) => {
        EXTENSION.addNewEditorElement(msg.elementType, msg.elementPosition, msg.defaults);
        EXTENSION.editorState = {
          tool: { type: EditorToolId.POINTER, parameters: undefined },
        };
      }),
      this.document.messageService.on('deleteElement', (msg) => {
        EXTENSION.deleteEditorElement(msg.id);
      }),

      this.document.messageService.on('selectElements', (msg) => {
        this.document.applyEdit((document) => {
          document.content.selectedElementIds = msg.ids;
          document.content.primarySelectedElementId = msg.ids[0] ?? null;
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
            //Skipping updateElementLayout message because the layout hasn't changed
            return false;
          }
          element.layout = {
            ...element.layout,
            ...msg.changes,
          };

          if (element.type === EditorElementType.Image) {
            const imageElement = element as EditorElement<EditorElementType.Image>;

            imageElement.data = {
              ...imageElement.data,
              configuredWidth: true,
              aspectRatio: msg.aspectRatio ?? imageElement.data.aspectRatio,
            };
          }
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
            //Skipping updateElement message because the data hasn't changed
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
              } as typeof el.data,
              style: {
                ...el.style,
                ...msg.changes.style,
              },
            };
          });
          return true;
        });
      }),

      this.document.messageService.on('addImageFromBytes', (msg) => {
        const bytes = new Uint8Array(msg.bytes);
        this.document.applyEdit((document) => {
          addImageToDocument(document, msg.name, bytes);
        });
      }),

      // The editor sends a freshly drawn element (e.g. a freehand stroke).
      // Append it to the document; the change broadcasts 'updateDocument' to all panels.
      this.document.messageService.on('addFreehandElement', (msg) => {
        this.document.applyEdit((document) => {
          document.content.elements.push(msg.element);
        });
      }),

      // Mirror the in-progress freehand stroke to the projector while drawing.
      this.document.messageService.on('freehandPreview', (msg) => {
        this.document.messageService.send({
          type: 'freehandPreview',
          points: msg.points,
          color: msg.color,
          width: msg.width,
          opacity: msg.opacity,
          lineStyle: msg.lineStyle,
          dashScale: msg.dashScale,
          straight: msg.straight,
        });
      }),
      this.document.messageService.on('freehandPreviewEnd', () => {
        this.document.messageService.send({ type: 'freehandPreviewEnd' });
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
