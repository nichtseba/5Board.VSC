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
  ImageElementData,
  Preset,
  ProjectorPointerStyle,
  createAddElementToolFromPreset,
  normalizeElementRevealOrder,
  flattenBoardElements,
  isGroupElement,
  groupElementsInDocument,
  ungroupElementsInDocument,
} from '5board.vsc-common';
import { Command, ExtensionBase } from './ExtensionBase';
import { ExportPreviewProvider } from './providers/ExportPreviewProvider';
import { ProjectorProvider } from './providers/ProjectorProvider';
import { FiveBoardFileSystemProvider } from './FiveBoardFileSystemProvider';
import { PackageManager } from './PackageManager';
import { SidebarManager } from './sidebar/SidebarManager';
import { SettingsService } from './SettingsService';
import { createDefaultElement } from './board/addElement/createDefaultElement';
import { PresetProvider } from './presets/PresetProvider';
import { ElementClipboardService } from './ElementClipboardService';

export class FiveBoardExtension extends ExtensionBase {
  private messages = new MessageService();
  private presetProvider!: PresetProvider;
  private presetsReady = Promise.resolve();
  public readonly packageManager = new PackageManager();
  public readonly settingsService = new SettingsService();
  private openDocuments = new Map<string, BoardCustomDocument>();
  private readonly elementClipboard = new ElementClipboardService((uri) =>
    this.getDocumentForUri(uri),
  );

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

  private editorState_: EditorState = {
    tool: { type: DEFAULT_TOOL_ID, parameters: undefined },
    presets: [],
  };
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
    this.presetProvider = new PresetProvider(context.globalStorageUri);
    this.presetsReady = this.presetProvider.loadPresets().then((presets) => {
      this.editorState = { presets };
    });
    context.subscriptions.push(this.settingsService);
    new EditorEditorProvider(context, this.packageManager).register();
    new ProjectorProvider(context).register();
    context.subscriptions.push(new SidebarManager(context, this.messages));
    context.subscriptions.push(
      this.settingsService.onDidChange((settings) => {
        const message = {
          type: 'settingsChanged' as const,
          settings: {
            colorPalette: settings.colorPalette,
          },
        };

        this.messages.send(message);
      }),
    );
    new FiveBoardFileSystemProvider(this.packageManager).register(context);
    new ExportPreviewProvider(context, this.packageManager).register();
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
      const settings = this.settingsService.getSettings();
      await BoardPackage.createEmpty(title, settings.grid).write(targetUri);
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

  @Command('5board-vsc.savePreset')
  async savePresetCommand(): Promise<void> {
    await this.presetsReady;
    const activeDocument = this.activeEditorDocument;
    if (!activeDocument) {
      vscode.window.showWarningMessage(t('extension.presets.noElementSelected'));
      return;
    }

    const selectedElementId = activeDocument.boardPackage.document.content.primarySelectedElementId;
    const selectedElement = activeDocument.boardPackage.document.content.elements.find(
      (element) => element.id === selectedElementId,
    );
    if (!selectedElement) {
      vscode.window.showWarningMessage(t('extension.presets.noElementSelected'));
      return;
    }

    if (isGroupElement(selectedElement)) {
      vscode.window.showInformationMessage(t('extension.presets.groupNotSupported'));
      return;
    }

    const name = await vscode.window.showInputBox({
      title: t('extension.presets.savePreset'),
      prompt: t('extension.presets.presetName'),
      placeHolder: t('extension.presets.presetNamePlaceholder'),
    });
    if (name === undefined) {
      return;
    }

    const options = [
      { key: 'keepStyle', label: t('extension.presets.keepStyle'), picked: true },
      { key: 'keepXPosition', label: t('extension.presets.keepPosition'), picked: false },
      { key: 'keepContent', label: t('extension.presets.keepContent'), picked: false },
    ];
    const selectedOptions = await vscode.window.showQuickPick(options, {
      title: t('extension.presets.presetOptions'),
      placeHolder: t('extension.presets.selectOptions'),
      canPickMany: true,
    });
    if (!selectedOptions?.length) {
      vscode.window.showInformationMessage(t('extension.presets.presetNotSaved'));
      return;
    }

    const optionKeys = selectedOptions.map((option) => option.key);
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      settings: {
        keepStyle: optionKeys.includes('keepStyle'),
        keepXPosition: optionKeys.includes('keepXPosition'),
        keepContent: optionKeys.includes('keepContent'),
      },
      element: selectedElement,
    };

    let imageBytes: Uint8Array | undefined;
    if (selectedElement.type === EditorElementType.Image) {
      const imageData = selectedElement.data as ImageElementData;
      const asset = activeDocument.boardPackage.document.assets.find(
        (candidate) => candidate.name === imageData.src,
      );
      if (!asset) {
        vscode.window.showWarningMessage(t('extension.presets.imageAssetMissing'));
        return;
      }
      imageBytes = asset.bytes;
      preset.asset = { fileName: `${preset.id}.bin` };
      if (!(optionKeys.includes('keepStyle') && optionKeys.length === 1)) {
        imageData.configuredWidth = true;
      }
    }

    await this.presetProvider.savePreset(preset, imageBytes);
    vscode.window.showInformationMessage(t('extension.presets.presetSaved'));
    this.editorState = { presets: [...this.editorState.presets, preset] };
  }

  @Command('5board-vsc.deletePreset')
  async deletePreset(id?: string): Promise<void> {
    await this.presetsReady;
    let presetId = id;
    if (!presetId) {
      const presets = this.editorState.presets;
      if (presets.length === 0) {
        return;
      }
      const selected = await vscode.window.showQuickPick(
        presets.map((preset) => ({ label: preset.name, description: preset.id })),
      );
      presetId = selected?.description;
    }
    if (!presetId) {
      return;
    }

    const deletedPreset = await this.presetProvider.deletePreset(presetId);
    if (deletedPreset) {
      this.editorState = {
        presets: this.editorState.presets.filter((preset) => preset.id !== presetId),
      };
    }
  }

  async loadPresetAsset(id: string): Promise<void> {
    await this.presetsReady;
    const preset = this.editorState.presets.find((candidate) => candidate.id === id);
    if (!preset) {
      return;
    }
    const presetWithAsset = await this.presetProvider.loadPresetAsset(preset);
    if (!presetWithAsset) {
      return;
    }
    this.editorState = {
      tool: createAddElementToolFromPreset(presetWithAsset),
    };
  }

  @Command('5board-vsc.revealPresetsFile')
  async revealPresetsFile(): Promise<void> {
    await this.presetsReady;
    await this.presetProvider.revealPresetsFile(this.editorState.presets);
  }

  @Command('5board-vsc.deleteEditorElement')
  deleteEditorElement(id: string): void {
    this.applyEditToActiveDocument((document) => {
      document.content.elements = document.content.elements.filter((e) => e.id !== id);
    });
  }

  @Command('5board-vsc.copy')
  async copyEditorElements(): Promise<void> {
    const document = this.activeEditorDocument;
    if (!document) {
      return;
    }
    await this.elementClipboard.copy(document);
  }

  @Command('5board-vsc.paste')
  async pasteEditorElements(): Promise<void> {
    const document = this.activeEditorDocument;
    if (!document) {
      return;
    }
    await this.elementClipboard.paste(document);
  }

  @Command('5board-vsc.duplicate')
  duplicateEditorElements(): void {
    const document = this.activeEditorDocument;
    if (!document) {
      return;
    }
    this.elementClipboard.duplicate(document);
  }

  @Command('5board-vsc.group')
  groupOrUngroupElements(): void {
    const activeDocument = this.activeEditorDocument;
    if (!activeDocument) {
      return;
    }

    const document = activeDocument.boardPackage.document;
    const selectedIds = document.content.selectedElementIds;

    if (selectedIds.length === 1) {
      const selectedElement = document.content.elements.find(
        (element) => element.id === selectedIds[0],
      );

      if (!selectedElement || !isGroupElement(selectedElement)) {
        return;
      }

      activeDocument.applyEdit((boardDocument) =>
        ungroupElementsInDocument(boardDocument, selectedElement.id),
      );
      return;
    }

    if (selectedIds.length < 2) {
      return;
    }

    activeDocument.applyEdit((boardDocument) =>
      groupElementsInDocument(boardDocument, selectedIds),
    );
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
      document.content.elements = normalizeElementRevealOrder(document.content.elements);
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
  @Command('5board-vsc.openSettings')
  public async openSettingsCommand(): Promise<void> {
    await vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:undefined_publisher.5board-vsc',
    );
  }

  @Command('5board-vsc.previewHtmlExport')
  async previewHtmlExportCommand(): Promise<void> {
    const uri = this.activeEditorDocument?.uri;

    if (!uri) {
      vscode.window.showErrorMessage(t('extension.htmlExport.noActiveBoard'));
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

  @Command('5board-vsc.goToElement')
  public goToElement(elementId: string): void {
    if (!this.activeEditorDocument) {
      return;
    }
    this.activeEditorDocument.messageService.send({ type: 'goToElement', elementId }, undefined);
  }

  @Command('5board-vsc.renameStructureItem')
  public async renameStructureItem(item?: vscode.TreeItem): Promise<void> {
    const activeDocument = this.activeEditorDocument;
    const elementId = item?.id;
    if (!activeDocument || !elementId) {
      return;
    }

    const element = activeDocument.boardPackage.document.content.elements.find(
      (candidate) => candidate.id === elementId,
    );
    if (!element || element.type === EditorElementType.Heading) {
      return;
    }

    const name = await vscode.window.showInputBox({
      title: t('webview.sidebar.renameElement'),
      value: element.name ?? '',
    });
    if (name === undefined || this.activeEditorDocument !== activeDocument) {
      return;
    }

    const currentElement = activeDocument.boardPackage.document.content.elements.find(
      (candidate) => candidate.id === elementId,
    );
    if (
      !currentElement ||
      currentElement.type === EditorElementType.Heading ||
      (name === '' ? currentElement.name === undefined : name === currentElement.name)
    ) {
      return;
    }

    this.applyEditToActiveDocument((document) => {
      const target = document.content.elements.find((candidate) => candidate.id === elementId);
      if (target && target.type !== EditorElementType.Heading) {
        target.name = name || undefined;
      }
    });
  }

  @Command('5board-vsc.revealNext')
  public revealNextCommand(): void {
    this.applyEditToActiveDocument((document) => {
      for (const element of flattenBoardElements(document.content.elements)) {
        if (!element.display.visible && !element.display.speakerNote) {
          element.display.visible = true;
          break;
        }
      }
    });
  }
}
