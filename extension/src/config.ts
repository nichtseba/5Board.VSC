import * as vscode from 'vscode';
import { clearToolchainCache } from './runner/javaToolchain';
import { clearPythonToolchainCache } from './runner/pythonToolchain';

const SECTION = '5board-vsc';

const HOME_SETTINGS: Record<string, { key: string; clearCache: () => void }> = {
  java: { key: 'java.home', clearCache: clearToolchainCache },
  python: { key: 'python.path', clearCache: clearPythonToolchainCache },
};

/** Where a language's toolchain home comes from; undefined lets the runner's own lookup decide. */
export function getConfiguredHome(language: string): string | undefined {
  const setting = HOME_SETTINGS[language];
  if (!setting) return undefined;
  const home = vscode.workspace.getConfiguration(SECTION).get<string>(setting.key, '').trim();
  return home || undefined;
}

/** A resolved toolchain is cached, so changing its setting has to drop the cache. */
export function watchToolchainSettings(): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    for (const setting of Object.values(HOME_SETTINGS)) {
      if (event.affectsConfiguration(`${SECTION}.${setting.key}`)) {
        setting.clearCache();
      }
    }
  });
}
