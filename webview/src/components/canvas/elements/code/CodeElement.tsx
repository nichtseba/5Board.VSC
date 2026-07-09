import { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  EditorElementType,
  extractBlock,
  COMMENT_PREFIX_BY_LANGUAGE,
  fileNameFromClassName,
  isDefaultClassName,
} from '5board.vsc-common';
import type { EditorElementProps } from '../../EditorElement';
import { useMessageService } from '../../../../services/MessageService';
import { useSources } from '../../../../providers/SourcesProvider';
import { useExecutionOutput } from '../../../../providers/ExecutionOutputProvider';
import { OutputPanel } from './OutputPanel';
import { useMonacoTheme } from './useMonacoTheme';
import { useEditorAutoHeight, MIN_HEIGHT } from './useEditorAutoHeight';
import { Icons } from '../../../Icons';

loader.config({ monaco });

// Kept short: the executeCodeblock command runs the last-synced code, so a long debounce
// widens the window in which a keyboard-triggered run executes stale code.
const DEBOUNCE_MS = 200;

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

  const { wrapperRef, handleMount } = useEditorAutoHeight();

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

  // Manual per-block overrides from the settings sidebar; undefined falls back to the
  // theme defaults set via the CSS classes below.
  const surfaceStyle = {
    backgroundColor: element.style.backgroundColor,
    borderColor: element.style.border?.color,
  };

  if (!source) {
    return (
      <div
        className="border border-focus-border rounded-sm p-3 bg-editor-widget-background text-errorForeground"
        style={surfaceStyle}
      >
        Source not found: {fileName}
      </div>
    );
  }

  return (
    <div
      className="border border-focus-border rounded-sm overflow-hidden bg-editor-widget-background relative"
      style={surfaceStyle}
    >
      {/* Header — only shown when assigned to a named class */}
      {!isDefaultClassName(className, element.id) && (
        <div className="flex items-center gap-2 px-2 py-0.5 border-b border-editor-widget-border bg-editorGroupHeader-tabsBackground">
          <span className="font-sans text-sm font-normal text-tab-activeForeground flex items-center gap-1 select-none">
            <Icons name="symbol-class" className="text-symbolIcon-classForeground" />
            {className}
          </span>
        </div>
      )}

      <div ref={wrapperRef} style={{ height: MIN_HEIGHT }}>
        <MonacoEditor
          height="100%"
          width="100%"
          value={code}
          language={language}
          theme={monacoTheme}
          onMount={(editor) => {
            handleMount(editor);
            // The executeCodeblock command can't flush this webview's debounce buffer, but
            // opening the Command Palette (or clicking elsewhere) blurs Monaco — flushing here
            // means those paths always execute fresh code.
            editor.onDidBlurEditorText(flushPendingUpdate);
          }}
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

      {/* Actionbar + Output */}
      <OutputPanel
        output={output}
        onOpenSource={() => messages.send({ type: 'openSource', elementId: element.id })}
        onRun={() => {
          flushPendingUpdate();
          messages.send({ type: 'executeCodeblock', elementId: element.id });
        }}
      />
    </div>
  );
}
