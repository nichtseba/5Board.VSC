import { useRef } from 'react';
import type * as monaco from 'monaco-editor';

export function useEditorAutoHeight() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleMount(editor: monaco.editor.IStandaloneCodeEditor) {
    const updateHeight = () => {
      if (wrapperRef.current) {
        wrapperRef.current.style.height = `${editor.getContentHeight()}px`;
        editor.layout();
      }
    };
    updateHeight();
    editor.onDidContentSizeChange(updateHeight);
  }

  return { wrapperRef, handleMount };
}
