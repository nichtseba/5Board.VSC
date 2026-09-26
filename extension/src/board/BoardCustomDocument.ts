import vscode from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument, EditorElement } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';
import { DocumentMessageHandlers } from './DocumentMessageHandlers';
import { CodeblockController } from './CodeblockController';

export class BoardCustomDocument implements vscode.CustomDocument {
  public readonly documentChange = new vscode.EventEmitter<BoardDocument>();
  public readonly onDocumentChange = this.documentChange.event;
  public readonly messageService = new MessageService();
  // Per-document codeblock coordinator; also reached by the executeCodeblock command.
  public readonly codeblock = new CodeblockController(this);
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

    this.disposables.push(
      this.boardPackage.onDocumentChange(() => {
        this.documentChange.fire(this.boardPackage.document);
      }),
    );

    this.registerMessageHandlers();
  }

  private registerMessageHandlers(): void {
    this.unsubscribers.push(...new DocumentMessageHandlers(this).register());
    this.unsubscribers.push(...this.codeblock.register());
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
    EXTENSION.projectorDocument = this;
    this.broadcastProjectorState();
  }

  /** Detach projector panel (destroy) */
  public removeProjector(): void {
    this.projectorCount = Math.max(0, this.projectorCount - 1);
    if (!this.hasProjector && EXTENSION.projectorDocument === this) {
      EXTENSION.projectorDocument = null;
    }
    this.broadcastProjectorState();
  }

  /**
   * Current projector state, derived from global + document state:
   * - active: pointer should be mirrored (tracking on AND a beamer open AND not paused)
   * - open: projector/beamer window is open
   * - paused: mirroring is frozen until the user resumes
   * Shared by every place that needs to send it (this document's broadcast, a
   * newly-opened panel's 'ready' sync, the sidebars via SidebarManager).
   */
  public get projectorState() {
    const paused = EXTENSION.projectorPaused;
    const open = this.hasProjector;
    return {
      type: 'projectorStateChanged' as const,
      active: EXTENSION.cursorTrackingEnabled && open && !paused,
      open,
      paused,
    };
  }

  public broadcastProjectorState(): void {
    this.messageService.send(this.projectorState);
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

  public applyEdit(edit: (document: BoardDocument) => void): void {
    edit(this.boardPackage.document);
    this.documentChange.fire(this.boardPackage.document);
  }

  /** Merges changes into the data of the element with the given id and persists the edit. */
  public updateElement(id: string, changes: Partial<EditorElement>): void {
    this.applyEdit((document) => {
      const element = document.content.elements.find((e) => e.id === id);
      if (!element) return;
      if (changes.data) {
        element.data = { ...element.data, ...changes.data };
      }
    });
  }
}
