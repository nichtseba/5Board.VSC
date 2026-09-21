import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  EditorElementType,
  commentPrefixFor,
  extractBlock,
  fileNameFromClassName,
  formatMessage,
  isDefaultClassName,
} from '5board.vsc-common';
import type { EditorElementProps } from '../../EditorElement';
import { useMessageService } from '../../../../services/MessageService';
import { useSources } from '../../../../providers/SourcesProvider';
import { useLocalization } from '../../../../providers/LocalizationProvider';
import {
  useExecutionOutput,
  useExecutionReadOnly,
} from '../../../../providers/ExecutionOutputProvider';
import { OutputPanel } from './OutputPanel';
import { useMonacoTheme } from './useMonacoTheme';
import { useEditorAutoHeight, MIN_HEIGHT } from './useEditorAutoHeight';
import { useBlockCodeSync } from './useBlockCodeSync';
import { useMonacoClipboard } from './useMonacoClipboard';
import { Icons } from '../../../Icons';

loader.config({ monaco });

export function CodeElement({ element }: EditorElementProps<EditorElementType.Code>) {
  const messages = useMessageService();
  const sources = useSources();
  const { t } = useLocalization();
  const { language, className, lastOutput, outputCollapsed } = element.data;
  const executionState = useExecutionOutput(element.id, lastOutput);
  const readOnly = useExecutionReadOnly();

  const fileName = fileNameFromClassName(className, language);
  const source = sources.find((s) => s.name === fileName && s.language === language);
  const blockCode = source
    ? extractBlock(source.code, element.id, commentPrefixFor(language))
    : null;

  const { code, change, flush } = useBlockCodeSync(element.id, blockCode);
  const monacoTheme = useMonacoTheme();
  const { wrapperRef, handleMount } = useEditorAutoHeight();
  const registerClipboard = useMonacoClipboard();

  // Per-block overrides from the settings sidebar; undefined falls back to the theme classes.
  const surfaceStyle = {
    backgroundColor: element.style.backgroundColor,
    borderColor: element.style.border?.color,
  };
  const hasCustomBg = element.style.backgroundColor != null;

  if (!source) {
    return (
      <div
        className="border border-focus-border rounded-sm p-3 bg-editor-widget-background text-errorForeground"
        style={surfaceStyle}
      >
        {formatMessage(t('webview.codeblock.sourceNotFound'), { fileName })}
      </div>
    );
  }

  return (
    <div
      className="border border-focus-border rounded-sm overflow-hidden bg-editor-widget-background relative"
      style={surfaceStyle}
    >
      {!isDefaultClassName(className, element.id) && (
        <div className="flex items-center gap-2 px-2 py-0.5 border-b border-editor-widget-border bg-editorGroupHeader-tabsBackground">
          <span className="font-sans text-sm font-normal text-tab-activeForeground flex items-center gap-1 select-none">
            <Icons name="symbol-class" className="text-symbolIcon-classForeground" />
            {className}
          </span>
        </div>
      )}

      <div ref={wrapperRef} style={{ height: MIN_HEIGHT }} data-code-id={element.id}>
        {hasCustomBg && (
          <style>{`[data-code-id="${element.id}"] .monaco-editor, [data-code-id="${element.id}"] .monaco-editor-background, [data-code-id="${element.id}"] .monaco-editor .margin { background-color: transparent !important; }`}</style>
        )}
        <MonacoEditor
          height="100%"
          width="100%"
          value={code}
          language={language}
          theme={monacoTheme}
          onMount={(editor) => {
            handleMount(editor);
            // Opening the Command Palette blurs Monaco, so Ctrl+Shift+E runs fresh code.
            editor.onDidBlurEditorText(flush);
            registerClipboard(editor);
          }}
          onChange={(value) => change(value ?? '')}
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

      <OutputPanel
        elementId={element.id}
        state={executionState}
        readOnly={readOnly}
        collapsed={outputCollapsed ?? false}
        onOpenSource={() => messages.send({ type: 'openSource', elementId: element.id })}
        onRun={() => {
          flush();
          messages.send({ type: 'executeCodeblock', elementId: element.id });
        }}
      />
    </div>
  );
}
