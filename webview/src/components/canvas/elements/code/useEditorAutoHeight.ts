import { useRef } from 'react';
import type * as monaco from 'monaco-editor';

const LINE_HEIGHT = 19;
const VERTICAL_PADDING = 16;
const MAX_VISIBLE_LINES = 10;
export const MIN_HEIGHT = LINE_HEIGHT;
const MAX_HEIGHT = MAX_VISIBLE_LINES * LINE_HEIGHT + VERTICAL_PADDING;

export function useEditorAutoHeight() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleMount(editor: monaco.editor.IStandaloneCodeEditor) {
    const updateHeight = () => {
      const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, editor.getContentHeight()));
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
