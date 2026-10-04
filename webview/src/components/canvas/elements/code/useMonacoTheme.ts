import { useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';

type BaseTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';

function getBaseTheme(): BaseTheme {
  const kind = document.body.getAttribute('data-vscode-theme-kind');
  if (kind === 'vscode-light') return 'vs';
  if (kind === 'vscode-high-contrast') return 'hc-black';
  if (kind === 'vscode-high-contrast-light') return 'hc-light';
  return 'vs-dark';
}

// Token (syntax) colors are not exposed to webviews (microsoft/vscode#32813), only these.
const COLOR_BY_CSS_VAR: Record<string, string> = {
  'editor.background': '--vscode-editor-background',
  'editor.foreground': '--vscode-editor-foreground',
  'editor.selectionBackground': '--vscode-editor-selectionBackground',
  'editor.inactiveSelectionBackground': '--vscode-editor-inactiveSelectionBackground',
  'editor.selectionHighlightBackground': '--vscode-editor-selectionHighlightBackground',
  'editor.lineHighlightBackground': '--vscode-editor-lineHighlightBackground',
  'editorCursor.foreground': '--vscode-editorCursor-foreground',
  'editorLineNumber.foreground': '--vscode-editorLineNumber-foreground',
  'editorLineNumber.activeForeground': '--vscode-editorLineNumber-activeForeground',
  'editorWhitespace.foreground': '--vscode-editorWhitespace-foreground',
  'editorWidget.background': '--vscode-editorWidget-background',
  'editorWidget.border': '--vscode-editorWidget-border',
  'editorSuggestWidget.background': '--vscode-editorSuggestWidget-background',
  'editorSuggestWidget.border': '--vscode-editorSuggestWidget-border',
  'editorHoverWidget.background': '--vscode-editorHoverWidget-background',
  'editorHoverWidget.border': '--vscode-editorHoverWidget-border',
};

// A fresh name per definition: redefining the active theme makes syntax highlighting flicker.
let themeSeq = 0;

function defineThemeFromWorkbench(): string {
  const base = getBaseTheme();
  const name = `5board-${base}-${themeSeq++}`;

  const styles = getComputedStyle(document.body);
  const colors: Record<string, string> = {};
  for (const [colorId, cssVar] of Object.entries(COLOR_BY_CSS_VAR)) {
    const value = styles.getPropertyValue(cssVar).trim();
    // defineTheme only accepts hex colors; skip unset or non-hex values.
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) colors[colorId] = value;
  }

  monaco.editor.defineTheme(name, { base, inherit: true, rules: [], colors });
  return name;
}

/** Mirrors the active VS Code theme's editor colors into a Monaco theme. */
export function useMonacoTheme(): string {
  const [monacoTheme, setMonacoTheme] = useState(defineThemeFromWorkbench);

  useEffect(() => {
    const observer = new MutationObserver(() => setMonacoTheme(defineThemeFromWorkbench()));
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-vscode-theme-kind', 'data-vscode-theme-name'],
    });
    return () => observer.disconnect();
  }, []);

  return monacoTheme;
}
