import vscode from 'vscode';
import { FiveBoardExtension } from './FiveBoardExtension';

export const EXTENSION = new FiveBoardExtension();

export function activate(context: vscode.ExtensionContext) {
  EXTENSION.activate(context);
}

export function deactivate() {
  EXTENSION.deactivate();
}
