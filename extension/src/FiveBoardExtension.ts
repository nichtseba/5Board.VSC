import * as vscode from 'vscode';
import { MessageService } from './MessageService';
import { EditorEditorProvider } from './providers/EditorEditorProvider';
import { t } from './localization';
import path from 'path';
import { BoardPackage } from './board/package';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import {
  BoardDocument,
  DEFAULT_PROJECTOR_POINTER_STYLE,
  DEFAULT_TOOL_ID,
  EditorElementType,
  EditorState,
  ProjectorPointerStyle,
} from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { ProjectorProvider } from './providers/ProjectorProvider';
import { FiveBoardFileSystemProvider } from './FiveBoardFileSystemProvider';
import { PackageManager } from './PackageManager';
import { SidebarManager } from './sidebar/SidebarManager';
import { resolveJavaToolchain } from './runner/javaToolchain';
import { formatToolchainReport } from './runner/javaToolchainMessages';
import { getConfiguredHome } from './config';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  public readonly packageManager = new PackageManager();
  private openDocuments = new Map<string, BoardCustomDocument>();
  private toolchainOutput?: vscode.OutputChannel;

  public registerDocument(document: BoardCustomDocument): void {
    if (!this.openDocuments.has(document.uri.toString())) {
      this.openDocuments.set(document.uri.toString(), document);
    }
  }

  public unregisterDocument(uri: vscode.Uri): void {
    this.openDocuments.delete(uri.toString());
  }

  public getDocumentForUri(uri: vscode.Uri): BoardCustomDocument | undefined {
    return this.openDocuments.get(uri.toString());
  }

  public cursorTrackingEnabled = true;
  public projectorPointerStyle: ProjectorPointerStyle = DEFAULT_PROJECTOR_POINTER_STYLE;

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
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    const tabInput = activeTab?.input;

    if (
      tabInput instanceof vscode.TabInputCustom &&
      tabInput.viewType === EditorEditorProvider.VIEW_TYPE
    ) {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        tabInput.uri,
        ProjectorProvider.VIEW_TYPE,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      );
      await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');
      await vscode.commands.executeCommand('workbench.action.moveEditorGroupToNewWindow');
    } else {
      vscode.window.showWarningMessage(t('extension.projector.noFileOpen'));
    }
  }

  @Command('5board-vsc.executeCodeblock')
  async executeCodeblockCommand(elementId?: string): Promise<void> {
    const document = this.activeEditorDocument;
    if (!document) {
      vscode.window.showWarningMessage(t('extension.codeblock.noActiveDocument'));
      return;
    }
    // Without an explicit elementId (programmatic invocation), run the selected element.
    const content = document.boardPackage.document.content;
    const id = elementId ?? content.selectedElementId;
    const element = content.elements.find((e) => e.id === id);
    if (!element || element.type !== EditorElementType.Code) {
      vscode.window.showWarningMessage(t('extension.codeblock.noCodeblockSelected'));
      return;
    }
    await document.codeblock.executeBlock(element.id);
  }

  @Command('5board-vsc.resetAllOutputs')
  async resetAllOutputsCommand(): Promise<void> {
    const document = this.activeEditorDocument;
    if (!document) {
      vscode.window.showWarningMessage(t('extension.codeblock.noActiveDocument'));
      return;
    }
    if (!document.codeblock.hasStoredOutputs()) {
      vscode.window.showInformationMessage(t('extension.codeblock.noOutputsToReset'));
      return;
    }
    const confirm = t('extension.codeblock.resetAllConfirmButton');
    const choice = await vscode.window.showWarningMessage(
      t('extension.codeblock.resetAllConfirm'),
      { modal: true },
      confirm,
    );
    if (choice === confirm) {
      document.codeblock.resetAllOutputs();
    }
  }

  public applyEditToActiveDocument(edit: (document: BoardDocument) => void): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.applyEdit(edit);
    this.activeDocumentChange.fire(this.activeEditorDocument);
  }

  /**
   * Reports which JDK the fallback chain settled on and what every stage saw. Written to an
   * output channel rather than a notification so the text can be copied when asking for help.
   */
  @Command('5board-vsc.showJavaToolchain')
  public async showJavaToolchain(): Promise<void> {
    const configuredHome = getConfiguredHome('java');
    const result = await resolveJavaToolchain(configuredHome);

    this.toolchainOutput ??= vscode.window.createOutputChannel(
      t('extension.codeblock.toolchain.report.title'),
    );
    this.toolchainOutput.clear();
    this.toolchainOutput.appendLine(formatToolchainReport(result, configuredHome));
    this.toolchainOutput.show(true);
  }

  @Command('5board-vsc.goToElement')
  public goToElement(elementId: string): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.messageService.send({ type: 'goToElement', elementId }, undefined);
  }
}
