import { useState, useEffect, useRef } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { EditorElementType, extractBlock, COMMENT_PREFIX_BY_LANGUAGE } from '5board.vsc-common';
import type { EditorElementProps } from '../EditorElement';
import { useMessageService } from '../../../services/MessageService';
import { useSources } from '../SourcesContext';

loader.config({ monaco });

const LINE_HEIGHT = 19;
const MIN_HEIGHT = 5 * LINE_HEIGHT;

function getMonacoTheme(): string {
  const kind = document.body.getAttribute('data-vscode-theme-kind');
  if (kind === 'vscode-light') return 'vs';
  if (kind === 'vscode-high-contrast') return 'hc-black';
  return 'vs-dark';
}

function fileNameToClassName(fileName: string): string {
  return fileName.replace(/\//g, '.').replace(/\.java$/, '');
}

export function CodeElement({ element }: EditorElementProps<EditorElementType.Code>) {
  const messages = useMessageService();
  const sources = useSources();
  const { language, fileName, codeBlockId, output } = element.data;

  const source = sources.find((s) => s.name === fileName && s.language === language);
  const prefix = COMMENT_PREFIX_BY_LANGUAGE[language] ?? '//';
  const blockCode = source ? extractBlock(source.code, codeBlockId, prefix) : null;

  const [code, setCode] = useState(blockCode ?? '');
  const className = fileNameToClassName(fileName);
  const hasOutput = Boolean(output);
  const [outputVisible, setOutputVisible] = useState(true);
  const [monacoTheme, setMonacoTheme] = useState(getMonacoTheme);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (blockCode !== null) {
      setCode(blockCode);
    }
  }, [blockCode]);

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
      const height = Math.max(MIN_HEIGHT, editor.getContentHeight());
      if (wrapperRef.current) {
        wrapperRef.current.style.height = `${height}px`;
        editor.layout();
      }
    };
    updateHeight();
    editor.onDidContentSizeChange(updateHeight);
  }

  if (!source) {
    return (
      <div className="border border-editor-widget-border rounded-sm p-3 bg-editor-background text-errorForeground">
        Source not found: {fileName}
      </div>
    );
  }

  return (
    <div className="border border-editor-widget-border rounded-sm overflow-hidden bg-editor-background relative">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-editor-widget-border bg-editorGroupHeader-tabsBackground">
        <span className="font-sans text-base text-tab-activeForeground flex items-center gap-1.5 select-none">
          <span className="codicon codicon-code text-symbolIcon-classForeground" />
          {language}
          {className && (
            <>
              <span className="text-editor-widget-border">·</span>
              <span className="codicon codicon-symbol-class text-symbolIcon-classForeground" />
              {className}
            </>
          )}
        </span>

        <div className="ml-auto">
          <button
            onClick={() => messages.send({ type: 'executeCodeblock', elementId: element.id })}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-button-background text-button-foreground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-button-hover-background"
          >
            <span className="codicon codicon-run" />
            Run
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div ref={wrapperRef} style={{ height: MIN_HEIGHT }}>
        <MonacoEditor
          height="100%"
          width="100%"
          value={code}
          language={language}
          theme={monacoTheme}
          onMount={handleMount}
          onChange={(v) => setCode(v ?? '')}
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
      </div>

      {/* Output */}
      {hasOutput && (
        <div className="border-t border-editor-widget-border">
          <button
            onClick={() => setOutputVisible((v) => !v)}
            className="w-full px-3 py-1 text-left font-sans text-base font-semibold uppercase tracking-wide text-panelTitle-activeForeground bg-panel-background border-none border-b border-panel-border flex items-center gap-2 cursor-pointer hover:bg-list-hover-background"
          >
            <span>{output && !output.success ? 'Output (Error)' : 'Output'}</span>
            <span
              className={`ml-auto codicon ${outputVisible ? 'codicon-chevron-up' : 'codicon-chevron-down'}`}
            />
          </button>

          {outputVisible && (
            <pre className="m-0 px-3 py-2 font-mono text-editor leading-relaxed overflow-x-auto bg-editor-background text-terminal-foreground">
              {output && !output.success && output.stderr ? (
                <span className="text-terminal-ansiRed">{output.stderr}</span>
              ) : (
                output?.stdout
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
