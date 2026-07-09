import { useRef } from 'react';
import type * as monaco from 'monaco-editor';

const LINE_HEIGHT = 19;
export const MIN_HEIGHT = 5 * LINE_HEIGHT;

export function useEditorAutoHeight() {
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  return { wrapperRef, handleMount };
}
