import { useState } from 'react';
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
  const { language, className, content, output, errorOutput } = element.data;
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
    <div>
      <div>
        <select defaultValue={language ?? 'java'}>
          <option value="java">java</option>
          <option value="python">python</option>
          <option value="javascript">javascript</option>
        </select>
        {className && (
          <>
            <span>CLASS:</span>
            <span>{className}</span>
          </>
        )}
        <button>&#9654; Run</button>
        <button>&#8943;</button>
      </div>

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

      {hasOutput && (
        <div>
          <button onClick={() => setOutputVisible((v) => !v)}>
            {outputVisible ? (errorOutput ? 'ERR ▲' : 'OUT ▲') : errorOutput ? 'ERR ▼' : 'OUT ▼'}
          </button>
          {outputVisible && <pre>{errorOutput ?? output}</pre>}
        </div>
      )}
    </div>
  );
}
