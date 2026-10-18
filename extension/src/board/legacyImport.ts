import * as path from 'path';
import * as vscode from 'vscode';
import {
  convertLegacyDocument,
  formatMessage,
  LegacyConversionWarning,
  validateOld5boardDocument,
} from '5board.vsc-common';
import { EXTENSION } from '../extension';
import { t } from '../localization';
import { EditorEditorProvider } from '../providers/EditorEditorProvider';
import { BoardPackage } from './package';

/**
 * Converts an old .5board file into a .5boardz file next to it and opens the result in the
 * editor. Asks before overwriting an existing .5boardz. Returns the written file, if any.
 */
export async function convertLegacyBoardFile(
  sourceUri: vscode.Uri,
): Promise<vscode.Uri | undefined> {
  try {
    const conversion = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('extension.legacyImport.converting'),
      },
      () => readLegacyBoard(sourceUri),
    );

    const targetUri = await chooseTargetUri(
      sourceUri.with({ path: replaceExtension(sourceUri.path) }),
    );
    if (!targetUri) {
      return undefined;
    }

    await new BoardPackage(conversion.document).write(targetUri);
    showConversionResult(sourceUri, targetUri, conversion.warnings);
    await vscode.commands.executeCommand(
      'vscode.openWith',
      targetUri,
      EditorEditorProvider.VIEW_TYPE,
    );
    return targetUri;
  } catch (error) {
    void vscode.window.showErrorMessage(
      `${t('extension.legacyImport.failed')} ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

async function readLegacyBoard(sourceUri: vscode.Uri) {
  const bytes = await vscode.workspace.fs.readFile(sourceUri);
  const legacy = validateOld5boardDocument(JSON.parse(new TextDecoder('utf-8').decode(bytes)));
  const title = path.basename(sourceUri.path, path.extname(sourceUri.path));
  return convertLegacyDocument(legacy, title, EXTENSION.settingsService.getSettings().grid);
}

/** The default target, or after confirmation / a save dialog when it already exists. */
async function chooseTargetUri(defaultUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  if (!(await exists(defaultUri))) {
    return defaultUri;
  }

  const overwrite = t('extension.legacyImport.overwrite');
  const saveAs = t('extension.legacyImport.saveAs');
  const choice = await vscode.window.showWarningMessage(
    formatMessage(t('extension.legacyImport.targetExists'), {
      fileName: path.basename(defaultUri.path),
    }),
    { modal: true },
    overwrite,
    saveAs,
  );

  if (choice === overwrite) {
    return defaultUri;
  }
  if (choice === saveAs) {
    return vscode.window.showSaveDialog({
      defaultUri,
      filters: { [t('extension.new5boardCommand.packageFilter')]: ['5boardz'] },
      saveLabel: t('extension.legacyImport.saveLabel'),
    });
  }
  return undefined;
}

function showConversionResult(
  sourceUri: vscode.Uri,
  targetUri: vscode.Uri,
  warnings: LegacyConversionWarning[],
): void {
  const params = { source: path.basename(sourceUri.path), target: path.basename(targetUri.path) };
  if (warnings.length === 0) {
    void vscode.window.showInformationMessage(
      formatMessage(t('extension.legacyImport.converted'), params),
    );
    return;
  }

  const details = warnings
    .map((warning) => `• ${formatMessage(t(warning.key), warning.params ?? {})}`)
    .join('\n');
  void vscode.window.showWarningMessage(
    formatMessage(t('extension.legacyImport.convertedWithWarnings'), params),
    { modal: true, detail: details },
  );
}

function replaceExtension(filePath: string): string {
  return `${filePath.slice(0, filePath.length - path.extname(filePath).length)}.5boardz`;
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
