import { EXTENSION } from '../extension';
import { BoardCustomDocument } from './BoardCustomDocument';

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
        });
      }),
      this.document.messageService.on('updateElement', (msg) => {
        this.document.updateElement(msg.id, msg.changes);
      }),
      //#endregion "General"

      //#region "EditorTools"
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

      // The editor sends a freshly drawn element (e.g. a freehand stroke).
      // Append it to the document; the change broadcasts 'updateDocument' to all panels.
      this.document.messageService.on('addElement', (msg) => {
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
