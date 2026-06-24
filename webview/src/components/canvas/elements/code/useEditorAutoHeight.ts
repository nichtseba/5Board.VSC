import { useRef } from 'react';
import type * as monaco from 'monaco-editor';

const LINE_HEIGHT = 19;
export const MIN_HEIGHT = 5 * LINE_HEIGHT;

/**
 * Grows the editor wrapper to fit the Monaco content height (never below MIN_HEIGHT), so the
 * code block expands with its content instead of showing an inner scrollbar.
 */
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
