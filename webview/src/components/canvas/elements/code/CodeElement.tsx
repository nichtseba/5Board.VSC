import { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  EditorElementType,
  extractBlock,
  COMMENT_PREFIX_BY_LANGUAGE,
  fileNameFromClassName,
} from '5board.vsc-common';
import type { EditorElementProps } from '../../EditorElement';
import { useMessageService } from '../../../../services/MessageService';
import { useSources } from '../../../../providers/SourcesProvider';
import { useExecutionOutput } from '../../../../providers/ExecutionOutputProvider';
import { OutputPanel } from './OutputPanel';
import { useMonacoTheme } from './useMonacoTheme';
import { useEditorAutoHeight, MIN_HEIGHT } from './useEditorAutoHeight';

loader.config({ monaco });

const DEBOUNCE_MS = 300;

export function CodeElement({ element }: EditorElementProps<EditorElementType.Code>) {
  const messages = useMessageService();
  const sources = useSources();
  const output = useExecutionOutput(element.id);
  const { language, className } = element.data;

  const fileName = fileNameFromClassName(className, language);
  const source = sources.find((s) => s.name === fileName && s.language === language);
  const prefix = COMMENT_PREFIX_BY_LANGUAGE[language] ?? '//';
  const blockCode = source ? extractBlock(source.code, element.id, prefix) : null;

  const [code, setCode] = useState(blockCode ?? '');
  const monacoTheme = useMonacoTheme();
  const { wrapperRef, handleMount } = useEditorAutoHeight();

  const codeRef = useRef(code);
  codeRef.current = code;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCodeRef = useRef<string | null>(null);

  const flushPendingUpdate = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingCodeRef.current !== null) {
      messages.send({
        type: 'updateBlockCode',
        elementId: element.id,
        code: pendingCodeRef.current,
      });
      pendingCodeRef.current = null;
    }
  }, [messages, element.id]);

  const sendDebouncedUpdate = useCallback(
    (newCode: string) => {
      pendingCodeRef.current = newCode;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        flushPendingUpdate();
      }, DEBOUNCE_MS);
    },
    [flushPendingUpdate],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (blockCode !== null && blockCode !== codeRef.current) {
      setCode(blockCode);
    }
  }, [blockCode]);

  if (!source) {
    return (
      <div className="border border-editor-widget-border rounded-sm p-3 bg-editor-background text-errorForeground">
        Source not found: {fileName}
      </div>
    );
  }

  return (
    <div className="border border-editor-widget-border rounded-sm overflow-hidden bg-editor-background relative">
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

        <div className="ml-auto flex items-center gap-1.5">
          <button
            title="Open source file"
            onClick={() => messages.send({ type: 'openSource', elementId: element.id })}
            className="flex items-center px-1.5 py-1 bg-transparent text-tab-activeForeground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-list-hover-background"
          >
            <span className="codicon codicon-go-to-file" />
          </button>
          <button
            onClick={() => {
              flushPendingUpdate();
              messages.send({ type: 'executeCodeblock', elementId: element.id });
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-button-background text-button-foreground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-button-hover-background"
          >
            <span className="codicon codicon-run" />
            Run
          </button>
        </div>
      </div>

      <div ref={wrapperRef} style={{ height: MIN_HEIGHT }}>
        <MonacoEditor
          height="100%"
          width="100%"
          value={code}
          language={language}
          theme={monacoTheme}
          onMount={handleMount}
          onChange={(v) => {
            const newCode = v ?? '';
            setCode(newCode);
            sendDebouncedUpdate(newCode);
          }}
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

      {output && <OutputPanel output={output} />}
    </div>
  );
}
