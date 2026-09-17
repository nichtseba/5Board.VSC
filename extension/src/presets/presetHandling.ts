import { EXTENSION } from '../extension';
import * as vscode from 'vscode';
import { t } from '../localization';
import {
  EditorElement,
  EditorState,
  EditorElementType,
  ImageElementData,
  Preset,
} from '5board.vsc-common';

const MAX_PRESET_IMAGE_BYTES = 10 * 1024 * 1024;

export async function savePresetsToFile(context: vscode.ExtensionContext): Promise<void> {
  if (
    EXTENSION.activeEditorDocument?.boardPackage.document.content.primarySelectedElementId === null
  ) {
    vscode.window.showWarningMessage(t('extension.presets.noElementSelected'));
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

  const selected = await vscode.window.showQuickPick(options, {
    title: t('extension.presets.presetOptions'),
    placeHolder: t('extension.presets.selectOptions'),
    canPickMany: true,
  });

  if (selected === undefined) {
    return;
  }

  const config = {
    name,
    options: selected.map((x) => x.key),
  };

  if (config.options.length === 0) {
    vscode.window.showInformationMessage(t('extension.presets.presetNotSaved'));
    return;
  }

  // Create Preset
  const selectedElementId =
    EXTENSION.activeEditorDocument?.boardPackage.document.content.primarySelectedElementId;
  const selectedElement =
    EXTENSION.activeEditorDocument?.boardPackage.document.content.elements.find(
      (e) => e.id === selectedElementId,
    );
  if (!selectedElement) {
    vscode.window.showWarningMessage(t('extension.presets.noElementSelected'));
    return;
  }

  const preset: Preset = {
    id: crypto.randomUUID(),
    name: config.name,
    settings: {
      keepStyle: config.options.includes('keepStyle'),
      keepXPosition: config.options.includes('keepXPosition'),
      keepContent: config.options.includes('keepContent'),
    },
    element: selectedElement as EditorElement,
  };

  if (selectedElement.type === EditorElementType.Image) {
    const asset = EXTENSION.activeEditorDocument?.boardPackage.document.assets.find(
      (candidate) => candidate.name === (selectedElement.data as ImageElementData).src,
    );
    if (!asset) {
      vscode.window.showWarningMessage(t('extension.presets.imageAssetMissing'));
      return;
    }
    if (asset.bytes.length > MAX_PRESET_IMAGE_BYTES) {
      vscode.window.showWarningMessage(t('extension.presets.imageAssetTooLarge'));
      return;
    }
    preset.asset = Array.from(asset.bytes);
  }

  // Save Preset to Json
  const storageDir = context?.globalStorageUri;
  if (!storageDir) {
    return;
  }
  await vscode.workspace.fs.createDirectory(storageDir);

  const file = vscode.Uri.joinPath(storageDir, '5board-vsc-presets.json');
  let data: unknown = [];
  try {
    const fileContent = await vscode.workspace.fs.readFile(file);
    const parsed = JSON.parse(new TextDecoder().decode(fileContent));
    data = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
      data = [];
    }
  }
  (data as unknown[]).push(preset);

  const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2));

  await vscode.workspace.fs.writeFile(file, bytes);
  vscode.window.showInformationMessage(t('extension.presets.presetSaved'));

  // Update EditorState
  EXTENSION.editorState = {
    presets: [...(EXTENSION.editorState.presets ?? []), preset],
  };
}

export async function loadPresetsFromFile(
  context: vscode.ExtensionContext,
): Promise<EditorState['presets']> {
  const file = vscode.Uri.joinPath(context.globalStorageUri, '5board-vsc-presets.json');
  try {
    const fileContent = await vscode.workspace.fs.readFile(file);
    const presets = JSON.parse(new TextDecoder().decode(fileContent));
    return Array.isArray(presets) ? presets.filter(isPreset) : [];
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') {
      vscode.window.showWarningMessage(`Failed to load presets: ${String(error)}`);
    }
    return [];
  }
}

function isPreset(value: unknown): value is Preset {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const preset = value as Partial<Preset>;
  const element = preset.element;
  const layout = element?.layout;
  const settings = preset.settings;
  const hasValidAsset =
    preset.asset === undefined ||
    (Array.isArray(preset.asset) &&
      preset.asset.length <= MAX_PRESET_IMAGE_BYTES &&
      preset.asset.every(isByte));
  const hasValidImageAsset =
    element?.type !== EditorElementType.Image ||
    (typeof (element.data as ImageElementData)?.src === 'string' && Array.isArray(preset.asset));

  return (
    typeof preset.id === 'string' &&
    typeof preset.name === 'string' &&
    !!settings &&
    typeof settings.keepStyle === 'boolean' &&
    typeof settings.keepXPosition === 'boolean' &&
    typeof settings.keepContent === 'boolean' &&
    !!element &&
    Object.values(EditorElementType).includes(element.type) &&
    !!layout &&
    Number.isFinite(layout.xPos) &&
    Number.isFinite(layout.yPos) &&
    Number.isFinite(layout.width) &&
    Number.isFinite(layout.height) &&
    !!element.style &&
    typeof element.style.visible === 'boolean' &&
    hasValidAsset &&
    hasValidImageAsset
  );
}

function isByte(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255;
}
export async function deletePreset(id: string, context: vscode.ExtensionContext): Promise<void> {
  const presets = EXTENSION.editorState.presets ?? [];
  const nextPresets = presets.filter((preset) => preset.id !== id);

  if (nextPresets.length === presets.length || !context) {
    return;
  }

  const file = vscode.Uri.joinPath(context.globalStorageUri, '5board-vsc-presets.json');
  await vscode.workspace.fs.writeFile(
    file,
    new TextEncoder().encode(JSON.stringify(nextPresets, null, 2)),
  );
  EXTENSION.editorState = { presets: nextPresets };
}

export async function revealPresetsFile(context: vscode.ExtensionContext): Promise<void> {
  if (!context) {
    return;
  }

  const storageDir = context.globalStorageUri;
  const file = vscode.Uri.joinPath(storageDir, '5board-vsc-presets.json');
  await vscode.workspace.fs.createDirectory(storageDir);

  try {
    await vscode.workspace.fs.stat(file);
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') {
      throw error;
    }

    await vscode.workspace.fs.writeFile(
      file,
      new TextEncoder().encode(JSON.stringify(EXTENSION.editorState.presets ?? [], null, 2)),
    );
  }

  await vscode.commands.executeCommand('revealFileInOS', file);
}
