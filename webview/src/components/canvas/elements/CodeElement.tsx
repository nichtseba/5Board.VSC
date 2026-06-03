import { useState } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { EditorElementType } from '5board.vsc-common';
import type { EditorElementProps } from '../EditorElement';
import { CustomSelect } from './CustomSelect';

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
  const {
    language: initialLanguage,
    className: initialClassName,
    content,
    output,
    errorOutput,
  } = element.data;
  const [language, setLanguage] = useState(initialLanguage ?? 'java');
  const [className, setClassName] = useState(initialClassName ?? '');
  const hasOutput = Boolean(output || errorOutput);
  const [outputVisible, setOutputVisible] = useState(true);
  const [editorHeight, setEditorHeight] = useState(MIN_HEIGHT);

  function handleMount(editor: monaco.editor.IStandaloneCodeEditor) {
    const updateHeight = () => {
      setEditorHeight(Math.max(MIN_HEIGHT, editor.getContentHeight()));
    };
    updateHeight();
    editor.onDidContentSizeChange(updateHeight);
  }

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-900 relative z-0">
      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-4 py-3 border-b border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
        <CustomSelect
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'java', label: 'java' },
            { value: 'python', label: 'python' },
            { value: 'javascript', label: 'javascript' },
          ]}
        />

        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">|</span>

        {className && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">CLASS:</span>
            <CustomSelect
              value={className}
              onChange={setClassName}
              options={[{ value: className, label: className }]}
            />
          </div>
        )}

        {/* Right side buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg border border-blue-600 cursor-pointer transition-colors active:bg-blue-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Run
          </button>
          <button className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 cursor-pointer transition-colors rounded-lg">
            &#8943;
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <MonacoEditor
        height={editorHeight}
        width="100%"
        defaultValue={content}
        language={language ?? 'java'}
        theme={getMonacoTheme()}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          automaticLayout: true,
        }}
      />

      {/* Output Section */}
      {hasOutput && (
        <div className="border-t border-gray-300 dark:border-gray-700">
          <button
            onClick={() => setOutputVisible((v) => !v)}
            className="w-full px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-300 dark:border-gray-700"
          >
            <span className="font-bold">{errorOutput ? 'ERR' : 'OUT'}</span>
            <span className="ml-auto flex items-center justify-center w-4 h-4">
              {outputVisible ? (
                <svg
                  className="w-4 h-4 text-gray-600 dark:text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.77 12.79a1 1 0 01-1.41-1.41L10 9.41 6.64 12.77a1 1 0 11-1.41-1.41l4.24-4.24a1 1 0 011.41 0l4.24 4.24a1 1 0 010 1.41z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-gray-600 dark:text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a1 1 0 011.41 0L10 10.59l3.36-3.36a1 1 0 111.41 1.41l-4.24 4.24a1 1 0 01-1.41 0L5.23 8.62a1 1 0 010-1.41z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
          {outputVisible && (
            <pre className="px-4 py-3 text-xs text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-900 overflow-x-auto font-mono">
              {errorOutput ?? output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
