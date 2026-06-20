import vscode from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';

export class BoardCustomDocument implements vscode.CustomDocument {
  public readonly documentChange = new vscode.EventEmitter<BoardDocument>();
  public readonly onDocumentChange = this.documentChange.event;
  public readonly messageService = new MessageService();

  // Cursor tracking is ON by default.
  // The toggle in the sidebar drives this via FiveBoardExtension.toggleCursorTracking().
  private cursorTrackingEnabled_ = true;
  public get cursorTrackingEnabled(): boolean {
    return this.cursorTrackingEnabled_;
  }

  /** Flips cursor tracking and notifies this document's panels. Returns the new state. */
  public toggleCursorTracking(): boolean {
    this.cursorTrackingEnabled_ = !this.cursorTrackingEnabled_;
    this.messageService.send({
      type: 'cursorTrackingChanged',
      enabled: this.cursorTrackingEnabled_,
    });
    return this.cursorTrackingEnabled_;
  }

  constructor(
    public boardPackage: BoardPackage,
    public uri: vscode.Uri,
  ) {
    // Register in the global document registry so ProjectorEditorProvider can
    // find this document and attach the projector panel to the same MessageService.
    EXTENSION.registerDocument(this);

    this.messageService.on('ready', (_msg, sender) => {
      // Mark this document as the active one so the sidebar's tool selection
      // (which arrives via the global message service) can be forwarded here.
      EXTENSION.activeEditorDocument = this;
      this.messageService.send(
        {
          type: 'init',
          document: this.boardPackage.document,
          language: 'en',
        },
        sender,
      );
      // Sync current tracking state so the new panel starts in the correct state.
      this.messageService.send(
        { type: 'cursorTrackingChanged', enabled: this.cursorTrackingEnabled_ },
        sender,
      );
    });

    this.messageService.on('focus', () => {
      EXTENSION.activeEditorDocument = this;
    });

    // Forward cursor position only when tracking is enabled.
    // The editor gates its own sending too (for rAF performance), so this is a
    // second line of defence and keeps the projector in sync when tracking is toggled.
    this.messageService.on('cursorMove', (msg) => {
      if (this.cursorTrackingEnabled_) {
        this.messageService.send({ type: 'cursorMove', x: msg.x, y: msg.y });
      }
    });

    // When the mouse leaves the editor canvas, hide the cursor dot in the projector.
    this.messageService.on('cursorLeave', () => {
      this.messageService.send({ type: 'cursorHide' });
    });

    // Forward the selected element so the projector highlights the same element.
    this.messageService.on('selectElement', (msg) => {
      this.messageService.send({ type: 'selectElement', elementId: msg.elementId });
    });

    // The editor sends a freshly drawn element (e.g. a freehand stroke).
    // Append it to the document; the change broadcasts 'updateDocument' to all panels.
    this.messageService.on('addElement', (msg) => {
      this.applyEdit((document) => {
        document.content.elements.push(msg.element);
      });
    });

    // Mirror the in-progress freehand stroke to the projector while drawing.
    this.messageService.on('freehandPreview', (msg) => {
      this.messageService.send({
        type: 'freehandPreview',
        points: msg.points,
        color: msg.color,
        width: msg.width,
      });
    });
    this.messageService.on('freehandPreviewEnd', () => {
      this.messageService.send({ type: 'freehandPreviewEnd' });
    });

    // Forward scroll position from any panel to all other panels.
    // This keeps the projector's scroll position in sync with the editor.
    this.messageService.on('scroll', (msg) => {
      this.messageService.send({ type: 'scroll', top: msg.top, left: msg.left });
    });

    this.messageService.on('updateViewport', (msg) => {
      this.messageService.send({ type: 'viewportUpdate', viewport: msg.viewport });
    });

    this.onDocumentChange((document) => {
      this.messageService.send({ type: 'updateDocument', document });
    });
  }

  dispose(): void {
    EXTENSION.unregisterDocument(this.uri);
    EXTENSION.activeEditorDocument = null;
  }

  public async reloadDocument(): Promise<void> {
    if (!this.uri) {
      throw new Error('Cannot reload document without URI');
    }
    this.boardPackage = await BoardPackage.read(this.uri);
  }

  public async saveDocument(targetUri?: vscode.Uri): Promise<void> {
    await this.boardPackage.write(targetUri ?? this.uri);
  }

  public applyEdit(edit: (document: BoardDocument) => void): void {
    edit(this.boardPackage.document);
    this.documentChange.fire(this.boardPackage.document);
  }
}
