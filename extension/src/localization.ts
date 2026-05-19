import * as vscode from 'vscode';
import { t as translate } from '5board.vsc-common';

let currentLanguage = vscode.env.language;

export function setLanguage(language: string) {
  currentLanguage = language;
}

export function t(key: string): string {
  return translate(currentLanguage, key);
}
