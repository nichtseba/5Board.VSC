import { useState, useEffect } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { EditorElementType } from '5board.vsc-common';
import type { EditorElementProps } from '../EditorElement';

loader.config({ monaco });

const LINE_HEIGHT = 19;
const MIN_HEIGHT = 5 * LINE_HEIGHT;

function getMonacoTheme(): string {
  const kind = document.body.getAttribute('data-vscode-theme-kind');
  if (kind === 'vscode-light') return 'vs';
  if (kind === 'vscode-high-contrast') return 'hc-black';
  return 'vs-dark';
}

export function CodeElement({ element }: EditorElementProps<EditorElementType.Code>) {
  const { language, content, output, errorOutput } = element.data;
  const hasOutput = Boolean(output || errorOutput);
  const [outputVisible, setOutputVisible] = useState(true);
  const [editorHeight, setEditorHeight] = useState(MIN_HEIGHT);
  const [monacoTheme, setMonacoTheme] = useState(getMonacoTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setMonacoTheme(getMonacoTheme()));
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-vscode-theme-kind'],
    });
    return () => observer.disconnect();
  }, []);

  function handleMount(editor: monaco.editor.IStandaloneCodeEditor) {
    const updateHeight = () => {
      setEditorHeight(Math.max(MIN_HEIGHT, editor.getContentHeight()));
    };
    updateHeight();
    editor.onDidContentSizeChange(updateHeight);
  }

  return (
    <div className="border border-editor-widget-border rounded-sm overflow-hidden bg-editor-background relative">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-editor-widget-border bg-editorGroupHeader-tabsBackground">
        <span className="font-sans text-base text-tab-activeForeground flex items-center gap-1.5 select-none">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            className="text-symbolIcon-classForeground"
            fill="currentColor"
          >
            <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4 0a.5.5 0 1 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z" />
          </svg>
          {language ?? 'code'}
        </span>

        <div className="ml-auto">
          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-button-background text-button-foreground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-button-hover-background">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Run
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <MonacoEditor
        height={editorHeight}
        width="100%"
        defaultValue={content}
        language={language ?? 'plaintext'}
        theme={monacoTheme}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          padding: { top: 8, bottom: 8 },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          automaticLayout: true,
        }}
      />

      {/* Output */}
      {hasOutput && (
        <div className="border-t border-editor-widget-border">
          <button
            onClick={() => setOutputVisible((v) => !v)}
            className="w-full px-3 py-1 text-left font-sans text-base font-semibold uppercase tracking-wide text-panelTitle-activeForeground bg-panel-background border-none border-b border-panel-border flex items-center gap-2 cursor-pointer hover:bg-list-hover-background"
          >
            <span>{errorOutput ? 'Output (Error)' : 'Output'}</span>
            <span className="ml-auto text-[10px]">{outputVisible ? '▲' : '▼'}</span>
          </button>

          {outputVisible && (
            <pre className="m-0 px-3 py-2 font-mono text-editor leading-relaxed overflow-x-auto bg-editor-background text-terminal-foreground">
              {errorOutput ? <span className="text-terminal-ansiRed">{errorOutput}</span> : output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
