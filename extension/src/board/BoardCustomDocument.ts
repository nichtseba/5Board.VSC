import vscode from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';
import { DocumentMessageHandlers } from './DocumentMessageHandlers';

export class BoardCustomDocument implements vscode.CustomDocument {
  public readonly documentChange = new vscode.EventEmitter<BoardDocument>();
  public readonly onDocumentChange = this.documentChange.event;
  public readonly messageService = new MessageService();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly unsubscribers: (() => void)[] = [];
  private projectorCount = 0;

  constructor(
    public boardPackage: BoardPackage,
    public uri: vscode.Uri,
  ) {
    // Register in the global document registry so ProjectorProvider can
    // find this document and attach the projector panel to the same MessageService.
    EXTENSION.registerDocument(this);

    this.disposables.push(
      this.onDocumentChange((document) => {
        this.messageService.send({ type: 'updateDocument', document });
      }),
    );
    this.disposables.push(
      EXTENSION.onEditorStateChange((state) => {
        this.messageService.send({
          type: 'updateEditorState',
          editorState: state,
        });
      }),
    );

    this.registerMessageHandlers();
  }

  private registerMessageHandlers(): void {
    this.unsubscribers.push(...new DocumentMessageHandlers(this).register());
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.clearActiveEditorDocument();
  }

  /** Check if projector window is active/attached */
  public get hasProjector(): boolean {
    return this.projectorCount > 0;
  }

  /** Attach projector panel (init) */
  public addProjector(): void {
    this.projectorCount++;
    this.broadcastProjectorState();
  }

  /** Detach projector panel (destroy) */
  public removeProjector(): void {
    this.projectorCount = Math.max(0, this.projectorCount - 1);
    this.broadcastProjectorState();
  }

  /**
   * Tell the views about the current projector state
   * - active: pointer should be mirrored (tracking on AND a beamer open)
   * - open: projector/beamer window is open
   */
  public broadcastProjectorState(): void {
    const active = EXTENSION.cursorTrackingEnabled && this.hasProjector;
    this.messageService.send({ type: 'projectorStateChanged', active, open: this.hasProjector });
  }

  public clearActiveEditorDocument() {
    if (EXTENSION.activeEditorDocument === this) {
      EXTENSION.activeEditorDocument = null;
    }
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

  /**
   * Applies an edit to the document and fires the document change event if the document was changed.
   * @param edit A function that takes the current document and returns a boolean indicating whether the document was changed.
   */
  public applyEdit(edit: (document: BoardDocument) => boolean): boolean {
    if (edit(this.boardPackage.document)) {
      this.documentChange.fire(this.boardPackage.document);
      return true;
    }
    return false;
  }
}
