import * as vscode from 'vscode';
import { MessageService } from './MessageService';
import { EditorEditorProvider } from './providers/EditorEditorProvider';
import { t } from './localization';
import path from 'path';
import { BoardPackage } from './board/package';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import { BoardDocument, DEFAULT_TOOL_ID, EditorState } from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { ProjectorProvider } from './providers/projectorProvider';
import { FiveBoardFileSystemProvider } from './FiveBoardFileSystemProvider';
import { PackageManager } from './PackageManager';
import { SidebarManager } from './sidebar/SidebarManager';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  public readonly packageManager = new PackageManager();

  // Registry of all currently open editor documents, keyed by URI string.
  // ProjectorProvider uses this to find the matching editor document so
  // both panels can share the same MessageService instance.
  private openDocuments = new Map<string, BoardCustomDocument>();

  /** Register an editor document so the projector can find it by URI. */
  public registerDocument(document: BoardCustomDocument): void {
    // First registration wins — the editor always opens before the projector.
    if (!this.openDocuments.has(document.uri.toString())) {
      this.openDocuments.set(document.uri.toString(), document);
    }
  }

  /** Remove the document for this URI (called from BoardCustomDocument.dispose). */
  public unregisterDocument(uri: vscode.Uri): void {
    this.openDocuments.delete(uri.toString());
  }

  /** Look up the editor document for a given file URI. Returns undefined if not open. */
  public getDocumentForUri(uri: vscode.Uri): BoardCustomDocument | undefined {
    return this.openDocuments.get(uri.toString());
  }

  public cursorTrackingEnabled = true;

  private activeEditorDocument_: BoardCustomDocument | null = null;
  public get activeEditorDocument(): BoardCustomDocument | null {
    return this.activeEditorDocument_;
  }
  public set activeEditorDocument(document: BoardCustomDocument | null) {
    this.activeEditorDocument_ = document;
    this.activeDocumentChange.fire(document);
  }
  private activeDocumentChange = new vscode.EventEmitter<BoardCustomDocument | null>();
  public onActiveDocumentChange = this.activeDocumentChange.event;

  private editorState_: EditorState = { tool: { type: DEFAULT_TOOL_ID, parameters: undefined } };
  public get editorState(): EditorState {
    return this.editorState_;
  }
  public set editorState(state: Partial<EditorState>) {
    this.editorState_ = { ...this.editorState_, ...state };
    this.editorStateChange.fire(this.editorState_);
  }
  private editorStateChange = new vscode.EventEmitter<EditorState>();
  public onEditorStateChange = this.editorStateChange.event;

  public constructor() {
    super();
  }

  public activate(context: vscode.ExtensionContext): void {
    super.activate(context);
    new EditorEditorProvider(context, this.packageManager).register();
    // Register the projector so VS Code knows how to open .5boardz files in presentation mode.
    new ProjectorProvider(context).register();
    context.subscriptions.push(new SidebarManager(context, this.messages));
    new FiveBoardFileSystemProvider(this.packageManager).register(context);
  }

  @Command('5board-vsc.newBoard')
  async new5boardCommand(): Promise<void> {
    try {
      const targetUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
        filters: {
          [t('extension.new5boardCommand.packageFilter')]: ['5boardz'],
        },
        saveLabel: t('extension.new5boardCommand.createFile'),
      });

      if (!targetUri) {
        return;
      }
      // Todo: Maybe this should create an unsaved file
      const title = path.basename(targetUri.fsPath, path.extname(targetUri.fsPath));
      await BoardPackage.createEmpty(title).write(targetUri);
      await vscode.commands.executeCommand(
        'vscode.openWith',
        targetUri,
        EditorEditorProvider.VIEW_TYPE,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `${t('extension.new5boardCommand.createFileFailed')} ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Command('5board-vsc.startPresentation')
  async startPresentationCommand(): Promise<void> {
    // Use the tab API to find the URI of the currently active .5boardz editor.
    // This is more reliable than activeEditorDocument because it does not depend on
    // the webview having sent a 'focus' message.
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    const tabInput = activeTab?.input;

    if (
      tabInput instanceof vscode.TabInputCustom &&
      tabInput.viewType === EditorEditorProvider.VIEW_TYPE
    ) {
      // Open the projector beside the editor.
      // preserveFocus keeps the editor focused so the projector tab opens quietly.
      await vscode.commands.executeCommand(
        'vscode.openWith',
        tabInput.uri,
        ProjectorProvider.VIEW_TYPE,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      );
      // Focus the projector column (always the rightmost group after openWith Beside).
      await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');
      // Move the projector's entire column into its own VS Code window so it can
      // be placed on a second screen / beamer independently.
      await vscode.commands.executeCommand('workbench.action.moveEditorGroupToNewWindow');
    } else {
      vscode.window.showWarningMessage(t('extension.projector.noFileOpen'));
    }
  }

  public applyEditToActiveDocument(edit: (document: BoardDocument) => void): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.applyEdit(edit);
    this.activeDocumentChange.fire(this.activeEditorDocument);
  }
}
