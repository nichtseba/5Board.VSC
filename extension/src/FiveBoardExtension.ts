import * as vscode from 'vscode';
import { MessageService } from './MessageService';
import { EditorEditorProvider } from './providers/EditorEditorProvider';
import { t } from './localization';
import path from 'path';
import { BoardPackage } from './board/package';
import { BoardCustomDocument } from './board/BoardCustomDocument';
import {
  BoardDocument,
  AddElementDefaults,
  EditorElement,
  EditorElementType,
  EditorToolId,
  DEFAULT_PROJECTOR_POINTER_STYLE,
  DEFAULT_TOOL_ID,
  EditorState,
  ProjectorPointerStyle,
} from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { ProjectorProvider } from './providers/ProjectorProvider';
import { FiveBoardFileSystemProvider } from './FiveBoardFileSystemProvider';
import { PackageManager } from './PackageManager';
import { SidebarManager } from './sidebar/SidebarManager';
import { createDefaultElement } from './board/addElement/createDefaultElement';
import { addImageAsset } from './board/addElement/addImageToDocument';

const ELEMENT_CLIPBOARD_MARKER = '5board-vsc.elements';

type ElementClipboardPayload = {
  marker: typeof ELEMENT_CLIPBOARD_MARKER;
  sourceDocumentUri: string;
  elements: EditorElement[];
};

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  public readonly packageManager = new PackageManager();
  private openDocuments = new Map<string, BoardCustomDocument>();

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
  public projectorPaused = false;
  public projectorPointerStyle: ProjectorPointerStyle = DEFAULT_PROJECTOR_POINTER_STYLE;
  // Document with an attached projector; unlike activeEditorDocument, not tied to editor focus.
  private projectorDocument_: BoardCustomDocument | null = null;
  public get projectorDocument(): BoardCustomDocument | null {
    return this.projectorDocument_;
  }
  public set projectorDocument(document: BoardCustomDocument | null) {
    this.projectorDocument_ = document;
    this.projectorDocumentChange.fire(document);
  }
  // Sidebars run on their own MessageService, so push attach/detach to them here.
  private projectorDocumentChange = new vscode.EventEmitter<BoardCustomDocument | null>();
  public onProjectorDocumentChange = this.projectorDocumentChange.event;

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

  @Command('5board-vsc.deleteEditorElement')
  deleteEditorElement(id: string): void {
    this.applyEditToActiveDocument((document) => {
      document.content.elements = document.content.elements.filter((e) => e.id !== id);
    });
  }

  @Command('5board-vsc.copy')
  async copyEditorElements(): Promise<void> {
    const elements = this.getSelectedEditorElements();

    if (elements.length === 0) {
      return;
    }

    const payload: ElementClipboardPayload = {
      marker: ELEMENT_CLIPBOARD_MARKER,
      sourceDocumentUri: this.activeEditorDocument!.uri.toString(),
      elements: structuredClone(elements),
    };
    await vscode.env.clipboard.writeText(JSON.stringify(payload));
  }

  @Command('5board-vsc.paste')
  async pasteEditorElements(): Promise<void> {
    const clipboardText = await vscode.env.clipboard.readText();
    const payload = this.readElementClipboard(clipboardText);
    const activeDocument = this.activeEditorDocument;

    if (!payload || payload.elements.length === 0 || !activeDocument) {
      return;
    }

    try {
      const imageAssets = await this.getImageAssetsForPaste(payload, activeDocument);
      this.insertClonedElements(payload.elements, imageAssets);
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Image could not be inserted: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Command('5board-vsc.duplicate')
  duplicateEditorElements(): void {
    const elements = this.getSelectedEditorElements();

    if (elements.length === 0) {
      return;
    }

    this.insertClonedElements(elements);
  }

  @Command('5board-vsc.addNewEditorElement')
  addNewEditorElement(
    type: EditorElementType,
    position: EditorElement['layout'],
    defaults?: AddElementDefaults,
  ): void {
    this.applyEditToActiveDocument((document) => {
      const element = createDefaultElement(type, position, defaults, document);
      document.content.elements.push(element);
    });
  }

  @Command('5board-vsc.addImageFromFile')
  async addImageFromFileCommand(): Promise<void> {
    const activeDocument = this.activeEditorDocument;

    if (!activeDocument) {
      vscode.window.showInformationMessage('No active 5board document');
      return;
    }

    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        Images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
      },
    });

    const fileUri = uris?.[0];

    if (!fileUri) {
      return;
    }

    const bytes = await vscode.workspace.fs.readFile(fileUri);
    const assetName = path.basename(fileUri.fsPath);
    this.editorState = {
      tool: {
        type: EditorToolId.AddElement,
        parameters: {
          type: EditorElementType.Image,
          placementMode: 'free',
          defaults: {
            asset: {
              name: assetName,
              bytes: Array.from(bytes),
            },
          },
        },
      },
    };
  }

  public applyEditToActiveDocument(edit: (document: BoardDocument) => void): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.applyEdit(edit);
    this.activeDocumentChange.fire(this.activeEditorDocument);
  }

  private getSelectedEditorElements(): EditorElement[] {
    const document = this.activeEditorDocument?.boardPackage.document;

    if (!document) {
      return [];
    }

    const selectedIds = new Set(document.content.selectedElementIds);
    return document.content.elements.filter((element) => selectedIds.has(element.id));
  }

  private readElementClipboard(text: string): ElementClipboardPayload | null {
    try {
      const payload: unknown = JSON.parse(text);

      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('marker' in payload) ||
        payload.marker !== ELEMENT_CLIPBOARD_MARKER ||
        !('elements' in payload) ||
        !Array.isArray(payload.elements) ||
        !('sourceDocumentUri' in payload) ||
        typeof payload.sourceDocumentUri !== 'string'
      ) {
        return null;
      }

      return payload as ElementClipboardPayload;
    } catch {
      return null;
    }
  }

  private async getImageAssetsForPaste(
    payload: ElementClipboardPayload,
    targetDocument: BoardCustomDocument,
  ): Promise<Map<string, Uint8Array> | undefined> {
    if (payload.sourceDocumentUri === targetDocument.uri.toString()) {
      return undefined;
    }

    const sourceUri = vscode.Uri.parse(payload.sourceDocumentUri);
    const sourceDocument = this.getDocumentForUri(sourceUri)?.boardPackage.document;
    const sourcePackage = sourceDocument ?? (await BoardPackage.read(sourceUri)).document;
    const imageAssets = new Map<string, Uint8Array>();

    for (const element of payload.elements) {
      if (element.type !== EditorElementType.Image) {
        continue;
      }

      const imageElement = element as EditorElement<EditorElementType.Image>;
      const sourceAsset = sourcePackage.assets.find(
        (asset) => asset.name === imageElement.data.src,
      );
      if (!sourceAsset) {
        throw new Error(`Asset "${imageElement.data.src}" fehlt im Quelldokument`);
      }
      imageAssets.set(imageElement.data.src, sourceAsset.bytes);
    }

    return imageAssets;
  }

  private insertClonedElements(
    elements: EditorElement[],
    imageAssets?: Map<string, Uint8Array>,
  ): void {
    const clones = structuredClone(elements).map((element) => ({
      ...element,
      id: crypto.randomUUID(),
    }));
    const cloneIds = clones.map((element) => element.id);

    this.applyEditToActiveDocument((document) => {
      for (const clone of clones) {
        if (clone.type !== EditorElementType.Image || !imageAssets) {
          continue;
        }

        const imageClone = clone as EditorElement<EditorElementType.Image>;
        const bytes = imageAssets.get(imageClone.data.src);
        if (!bytes) {
          continue;
        }

        imageClone.data = {
          ...imageClone.data,
          src: addImageAsset(document, imageClone.data.src, new Uint8Array(bytes)),
        };
      }
      document.content.elements.push(...clones);
      document.content.selectedElementIds = cloneIds;
      document.content.primarySelectedElementId = cloneIds[0] ?? null;
    });
  }

  @Command('5board-vsc.goToElement')
  public goToElement(elementId: string): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.messageService.send({ type: 'goToElement', elementId }, undefined);
  }
}
