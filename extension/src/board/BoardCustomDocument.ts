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
  // The toggle button in the editor sends 'toggleCursorTracking' to flip this.
  private cursorTrackingEnabled = true;

  constructor(
    public boardPackage: BoardPackage,
    public uri: vscode.Uri,
  ) {
    // Register in the global document registry so ProjectorEditorProvider can
    // find this document and attach the projector panel to the same MessageService.
    EXTENSION.registerDocument(this);

    this.messageService.on('ready', (_msg, sender) => {
      this.messageService.send(
        { type: 'init', document: this.boardPackage.document, language: 'en' },
        sender,
      );
      // Sync current tracking state so the new panel starts in the correct state.
      this.messageService.send(
        { type: 'cursorTrackingChanged', enabled: this.cursorTrackingEnabled },
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
      if (this.cursorTrackingEnabled) {
        this.messageService.send({ type: 'cursorMove', x: msg.x, y: msg.y });
      }
    });

    // When the mouse leaves the editor canvas, hide the cursor dot in the projector.
    this.messageService.on('cursorLeave', () => {
      this.messageService.send({ type: 'cursorHide' });
    });

    // Toggle cursor tracking state and notify all panels so they can update their UI.
    this.messageService.on('toggleCursorTracking', () => {
      this.cursorTrackingEnabled = !this.cursorTrackingEnabled;
      this.messageService.send({
        type: 'cursorTrackingChanged',
        enabled: this.cursorTrackingEnabled,
      });
    });

    // Forward the selected element so the projector highlights the same element.
    this.messageService.on('selectElement', (msg) => {
      this.messageService.send({ type: 'selectElement', elementId: msg.elementId });
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
