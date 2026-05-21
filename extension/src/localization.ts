import * as vscode from 'vscode';
import { Language, normalizeLanguage, t as translate, TranslationKey } from '5board.vsc-common';

let currentLanguage: Language = normalizeLanguage(vscode.env.language);

export function setLanguage(language: Language) {
  currentLanguage = language;
}

export function t(key: TranslationKey): string {
  return translate(currentLanguage, key);
}
