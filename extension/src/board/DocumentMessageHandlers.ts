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
        // Sync current tracking state so the new panel starts in the correct state.
        this.document.messageService.send(
          { type: 'cursorTrackingChanged', enabled: EXTENSION.cursorTrackingEnabled },
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
      //#endregion "EditorTools"

      //#region "Projector"

      // Forward cursor position only when tracking is enabled.
      // The editor gates its own sending too (for rAF performance), so this is a
      // second line of defence and keeps the projector in sync when tracking is toggled.
      this.document.messageService.on('cursorMove', (msg) => {
        if (EXTENSION.cursorTrackingEnabled) {
          this.document.messageService.send({ type: 'cursorMove', x: msg.x, y: msg.y });
        }
      }),

      // When the mouse leaves the editor canvas, hide the cursor dot in the projector.
      this.document.messageService.on('cursorLeave', () => {
        this.document.messageService.send({ type: 'cursorHide' });
      }),

      // Forward scroll position from any panel to all other panels.
      // This keeps the projector's scroll position in sync with the editor.
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
