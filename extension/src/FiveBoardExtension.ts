import * as vscode from 'vscode';
import { MessageService } from './MessageService';
import { PackageManager } from './PackageManager';
import { EditorEditorProvider } from './providers/EditorEditorProvider';
import { t } from './localization';
import path from 'path';
import { BoardPackage } from './board/package';
import {
  ElementSettingsSidebarViewProvider,
  SidebarViewProvider,
} from './providers/SidebarViewProvider';
import { StructureTreeProvider } from './providers/StructureTreeProvider';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import { BoardDocument, DEFAULT_TOOL_ID, EditorState } from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { ExportPreviewProvider } from './providers/exportPreviewProvider';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  public readonly packageManager = new PackageManager();

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
    new SidebarViewProvider(context, this.messages).register();
    new ElementSettingsSidebarViewProvider(context, this.messages).register();
    new StructureTreeProvider(context).register();
    new ExportPreviewProvider(
      context,
      this.packageManager,
      () => this.activeEditorDocument,
    ).register();
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
  startPresentationCommand(): void {
    vscode.window.showInformationMessage('Presentation started');
  }

  @Command('5board-vsc.previewHtmlExport')
  async previewHtmlExportCommand(): Promise<void> {
    const uri = this.activeEditorDocument?.uri;

    if (!uri) {
      vscode.window.showErrorMessage('Open a .5boardz file first or save current file.');
      return;
    }

    await vscode.commands.executeCommand(
      'vscode.openWith',
      uri,
      ExportPreviewProvider.VIEW_TYPE,
      vscode.ViewColumn.Beside,
    );
  }

  public applyEditToActiveDocument(edit: (document: BoardDocument) => void): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.applyEdit(edit);
    this.activeDocumentChange.fire(this.activeEditorDocument);
  }
}
