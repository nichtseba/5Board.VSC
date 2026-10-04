import vscode from 'vscode';
import { BoardPackage } from './package';
import { BoardDocument } from '5board.vsc-common';
import { MessageService } from '../MessageService';
import { EXTENSION } from '../extension';
import { t } from '../localization';
import { DocumentMessageHandlers } from './DocumentMessageHandlers';

export class BoardCustomDocument implements vscode.CustomDocument {
  public readonly documentChange = new vscode.EventEmitter<{
    previous: BoardDocument;
    next: BoardDocument;
    isUndo: boolean;
    isRedo: boolean;
  }>();
  public readonly onDocumentChange = this.documentChange.event;
  public readonly messageService = new MessageService();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly unsubscribers: (() => void)[] = [];
  private projectorCount = 0;

  constructor(
    public boardPackage: BoardPackage,
    public uri: vscode.Uri,
  ) {
    this.messageService.on('ready', (_msg, sender) => {
      this.messageService.send(
        {
          type: 'init',
          document: this.boardPackage.document,
          editorState: EXTENSION.editorState,
          language: 'en',
        },
        sender,
      );
    });
    this.messageService.on('focus', () => {
      EXTENSION.activeEditorDocument = this;
    });
    this.messageService.on('saveHtmlExport', async (msg) => {
      await this.saveHtmlExport(msg.html, msg.backgroundColor);
    });
    this.onDocumentChange(({ next }) => {
      this.messageService.send({ type: 'updateDocument', document: next });
    });
    // Register in the global document registry so ProjectorProvider can
    // find this document and attach the projector panel to the same MessageService.
    EXTENSION.registerDocument(this);

    this.disposables.push(
      this.onDocumentChange(({ next }) => {
        this.messageService.send({ type: 'updateDocument', document: next });
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

  public async saveHtmlExport(html: string, backgroundColor: string): Promise<void> {
    const exportHtml = createHtmlExport(html, backgroundColor);

    const defaultUri = this.uri.with({
      path: this.uri.path.replace(/\.[^/.]+$/, '.html'),
    });

    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        HTML: ['html', 'htm'],
      },
      saveLabel: t('extension.htmlExport.saveLabel'),
    });

    if (!targetUri) {
      return;
    }

    await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(exportHtml));

    const openFolderLabel = t('extension.htmlExport.openContainingFolder');

    const selection = await vscode.window.showInformationMessage(
      `${t('extension.htmlExport.saved')} ${targetUri.fsPath}`,
      openFolderLabel,
    );

    if (selection === openFolderLabel) {
      await vscode.commands.executeCommand('revealFileInOS', targetUri);
    }
  }

  public applyEdit(
    edit: (document: BoardDocument) => BoardDocument,
    options?: { isUndo?: boolean; isRedo?: boolean },
  ): void {
    const previous = this.boardPackage.document;
    const next = edit(structuredClone(this.boardPackage.document));
    this.boardPackage.document = next;
    this.documentChange.fire({
      previous,
      next: this.boardPackage.document,
      isUndo: options?.isUndo ?? false,
      isRedo: options?.isRedo ?? false,
    });
  }
}

function createHtmlExport(html: string, backgroundColor: string): string {
  return `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>5Board Export</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          background: ${backgroundColor};
        }
      </style>
    </head>
    <body>
    ${html}
    </body>
    </html>`;
}
