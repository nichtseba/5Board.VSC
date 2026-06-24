import { useState, useEffect } from 'react';
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

export function CodeElement({ element }: EditorElementProps<EditorElementType.Code>) {
  const messages = useMessageService();
  const sources = useSources();
  const output = useExecutionOutput(element.id);
  const { language, className } = element.data;

  const fileName = fileNameFromClassName(className, language);
  const source = sources.find((s) => s.name === fileName && s.language === language);
  const prefix = COMMENT_PREFIX_BY_LANGUAGE[language] ?? '//';
  // The source block is marked with this element's own id (one element ↔ one block).
  const blockCode = source ? extractBlock(source.code, element.id, prefix) : null;

  const [code, setCode] = useState(blockCode ?? '');
  const monacoTheme = useMonacoTheme();
  const { wrapperRef, handleMount } = useEditorAutoHeight();

  useEffect(() => {
    if (blockCode !== null) {
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
      {output && <OutputPanel output={output} />}
    </div>
  );
}
