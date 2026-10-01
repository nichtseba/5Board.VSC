import {
  BoardElement,
  EditorElement,
  EditorElementType,
  EditorToolId,
  findBoardElementById,
  isGroupElement,
} from '5board.vsc-common';
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
        this.document.messageService.send(this.document.projectorState, sender);
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
      this.document.messageService.on('copyElements', () => {
        EXTENSION.copyEditorElements();
      }),
      this.document.messageService.on('pasteElements', () => {
        EXTENSION.pasteEditorElements();
      }),
      this.document.messageService.on('duplicateElements', () => {
        EXTENSION.duplicateEditorElements();
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
        const tocAlreadyExists =
          msg.elementType === EditorElementType.TableOfContents &&
          this.document.boardPackage.document.content.elements.some(
            (element) => element.type === EditorElementType.TableOfContents,
          );

        if (!tocAlreadyExists) {
          EXTENSION.addNewEditorElement(msg.elementType, msg.elementPosition, msg.defaults);
        }
        EXTENSION.editorState = {
          tool: { type: EditorToolId.POINTER, parameters: undefined },
        };
      }),
      this.document.messageService.on('deleteElements', (msg) => {
        msg.ids.forEach((id) => {
          EXTENSION.deleteEditorElement(id);
        });
      }),

      this.document.messageService.on('selectElements', (msg) => {
        this.document.applyEdit((document) => {
          document.content.selectedElementIds = msg.ids;
          document.content.primarySelectedElementId = msg.ids[0] ?? null;
        });
      }),

      this.document.messageService.on('updateElementsLayout', (msg) => {
        this.document.applyEdit((document) => {
          let changed = false;

          for (const update of msg.changes) {
            const element = findBoardElementById(document.content.elements, update.id);

            if (!element || isGroupElement(element)) {
              continue;
            }

            if (deepEquals(update.changes, element.layout)) {
              continue;
            }

            element.layout = {
              ...element.layout,
              ...update.changes,
            };

            if (element.type === EditorElementType.Image) {
              const imageElement = element as EditorElement<EditorElementType.Image>;

              imageElement.data = {
                ...imageElement.data,
                configuredWidth: true,
                aspectRatio: update.aspectRatio ?? imageElement.data.aspectRatio,
              };
            }

            changed = true;
          }

          return changed;
        });
      }),

      //#endregion "General"

      //#region "EditorTools"
      this.document.messageService.on('insertSpacerRows', (msg) => {
        this.document.applyEdit((document) => {
          let changed = false;
          forEachEditorElement(document.content.elements, (element) => {
            if (element.layout.yPos >= msg.startRow) {
              element.layout = {
                ...element.layout,
                yPos: element.layout.yPos + msg.rowCount,
              };
              changed = true;
            }
          });
          return changed;
        });
      }),
      this.document.messageService.on('textEditorCommand', (msg) => {
        if (!EXTENSION.activeEditorDocument) {
          return;
        }
        EXTENSION.activeEditorDocument.messageService.send(msg);
      }),
      this.document.messageService.on('updateElements', (msg) => {
        this.document.applyEdit((document) => {
          let changed = false;

          for (const update of msg.changes) {
            const element = findBoardElementById(document.content.elements, update.id);
            if (!element || isGroupElement(element)) {
              continue;
            }

            const nextData = {
              ...element.data,
              ...update.changes.data,
            };

            const nextLayout = {
              ...element.layout,
              ...update.changes.layout,
            };

            const nextStyle = {
              ...element.style,
              ...update.changes.style,
            };

            if (
              deepEquals(nextData, element.data) &&
              deepEquals(nextLayout, element.layout) &&
              deepEquals(nextStyle, element.style)
            ) {
              //Skipping updateElement message because the data hasn't changed
              continue;
            }

            element.layout = nextLayout;
            element.data = nextData as typeof element.data;
            element.style = nextStyle;
            changed = true;
          }
          return changed;
        });
      }),

      this.document.messageService.on('addImageFromBytes', (msg) => {
        EXTENSION.activeEditorDocument = this.document;
        EXTENSION.editorState = {
          tool: {
            type: EditorToolId.AddElement,
            parameters: {
              type: EditorElementType.Image,
              placementMode: 'free',
              defaults: {
                asset: {
                  name: msg.name,
                  bytes: msg.bytes,
                },
              },
            },
          },
        };
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
        if (EXTENSION.projectorPaused) return;
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
        if (EXTENSION.projectorPaused) return;
        this.document.messageService.send({ type: 'cursorMove', x: msg.x, y: msg.y });
      }),

      // When the mouse leaves the editor canvas, hide the cursor dot in the projector.
      this.document.messageService.on('cursorLeave', () => {
        if (EXTENSION.projectorPaused) return;
        this.document.messageService.send({ type: 'cursorHide' });
      }),

      // Forward scroll position from any panel to all other panels.
      // The editor only sends scroll when a projector window is open
      this.document.messageService.on('scroll', (msg) => {
        if (EXTENSION.projectorPaused) return;
        this.document.messageService.send({ type: 'scroll', top: msg.top, left: msg.left });
      }),

      this.document.messageService.on('updateViewport', (msg) => {
        this.document.messageService.send({ type: 'viewportUpdate', viewport: msg.viewport });
      }),
      //#endregion "Projector"
    ];
  }
}

function forEachEditorElement(
  elements: readonly BoardElement[],
  callback: (element: EditorElement) => void,
): void {
  for (const element of elements) {
    if (isGroupElement(element)) {
      forEachEditorElement(element.data.children, callback);
    } else {
      callback(element);
    }
  }
}
