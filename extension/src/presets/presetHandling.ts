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

const PRESET_ASSET_DIRECTORY = 'preset-assets';

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

  let imageBytes: Uint8Array | undefined;
  if (selectedElement.type === EditorElementType.Image) {
    const asset = EXTENSION.activeEditorDocument?.boardPackage.document.assets.find(
      (candidate) => candidate.name === (selectedElement.data as ImageElementData).src,
    );
    if (!asset) {
      vscode.window.showWarningMessage(t('extension.presets.imageAssetMissing'));
      return;
    }
    imageBytes = asset.bytes;
    preset.asset = { fileName: `${preset.id}.bin` };
    if (!(config.options.includes('keepStyle') && config.options.length === 1)) {
      (preset.element.data as ImageElementData).configuredWidth = true;
    }
  }

  // Save Preset to Json
  const storageDir = context?.globalStorageUri;
  if (!storageDir) {
    return;
  }
  await vscode.workspace.fs.createDirectory(storageDir);

  if (preset.asset) {
    const assetDirectory = vscode.Uri.joinPath(storageDir, PRESET_ASSET_DIRECTORY);
    await vscode.workspace.fs.createDirectory(assetDirectory);
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(assetDirectory, preset.asset.fileName),
      imageBytes!,
    );
  }

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
  const persistedPresets = (data as unknown[]).filter(isPreset).map(serializePreset);
  persistedPresets.push(serializePreset(preset));

  const bytes = new TextEncoder().encode(JSON.stringify(persistedPresets, null, 2));

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
    const parsed = JSON.parse(new TextDecoder().decode(fileContent));
    if (!Array.isArray(parsed)) {
      return [];
    }

    const presets: Preset[] = [];
    for (const value of parsed) {
      if (isPreset(value)) {
        presets.push(value);
        continue;
      }
    }
    return presets;
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
    (typeof preset.asset === 'object' &&
      typeof preset.asset.fileName === 'string' &&
      isSafeAssetFileName(preset.asset.fileName));
  const hasValidImageAsset =
    element?.type !== EditorElementType.Image ||
    (typeof (element.data as ImageElementData)?.src === 'string' && !!preset.asset);

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

function isSafeAssetFileName(fileName: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(fileName);
}

function serializePreset(preset: Preset): Preset {
  return {
    ...preset,
    asset: preset.asset ? { fileName: preset.asset.fileName } : undefined,
  };
}

export async function loadPresetAsset(
  id: string,
  context: vscode.ExtensionContext,
): Promise<Preset | undefined> {
  const preset = (EXTENSION.editorState.presets ?? []).find((candidate) => candidate.id === id);
  if (!preset?.asset) {
    return undefined;
  }

  if (preset.asset.bytes) {
    return preset;
  }

  try {
    const file = vscode.Uri.joinPath(
      context.globalStorageUri,
      PRESET_ASSET_DIRECTORY,
      preset.asset.fileName,
    );
    const bytes = await vscode.workspace.fs.readFile(file);
    return { ...preset, asset: { ...preset.asset, bytes: Array.from(bytes) } };
  } catch (error) {
    vscode.window.showWarningMessage(`Failed to load preset image: ${String(error)}`);
    return undefined;
  }
}

export async function deletePreset(id: string, context: vscode.ExtensionContext): Promise<void> {
  const presets = EXTENSION.editorState.presets ?? [];
  const deletedPreset = presets.find((preset) => preset.id === id);
  const nextPresets = presets.filter((preset) => preset.id !== id);

  if (nextPresets.length === presets.length || !context) {
    return;
  }

  const file = vscode.Uri.joinPath(context.globalStorageUri, '5board-vsc-presets.json');
  if (deletedPreset?.asset) {
    try {
      await vscode.workspace.fs.delete(
        vscode.Uri.joinPath(
          context.globalStorageUri,
          PRESET_ASSET_DIRECTORY,
          deletedPreset.asset.fileName,
        ),
        { useTrash: false },
      );
    } catch (error) {
      if (!(error instanceof vscode.FileSystemError) || error.code !== 'FileNotFound') {
        throw error;
      }
    }
  }
  await vscode.workspace.fs.writeFile(
    file,
    new TextEncoder().encode(JSON.stringify(nextPresets.map(serializePreset), null, 2)),
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
      new TextEncoder().encode(
        JSON.stringify((EXTENSION.editorState.presets ?? []).map(serializePreset), null, 2),
      ),
    );
  }

  await vscode.commands.executeCommand('revealFileInOS', file);
}
