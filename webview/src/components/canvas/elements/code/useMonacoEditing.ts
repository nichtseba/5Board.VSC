import { useCallback, useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useLocalization } from '../../../../providers/LocalizationProvider';

type Point = { x: number; y: number };

/**
 * Monaco only takes input in editing mode (double-click, like a text element); otherwise clicks
 * select and drag the block. Returns a function to call from Monaco's `onMount`.
 */
export function useMonacoEditing(
  editing: boolean,
  editingPosition: Point | null | undefined,
  onStopEditing: (() => void) | undefined,
) {
  const { t } = useLocalization();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const stopEditingRef = useRef(onStopEditing);
  stopEditingRef.current = onStopEditing;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!editing) {
      if (editor.hasTextFocus() && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }
    const target = editingPosition
      ? editor.getTargetAtClientPoint(editingPosition.x, editingPosition.y)
      : null;
    if (target?.position) editor.setPosition(target.position);
    editor.focus();
  }, [editing, editingPosition]);

  return useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      editor.onDidBlurEditorWidget(() => stopEditingRef.current?.());
      editor.addAction({
        id: '5board-stop-editing',
        label: t('webview.codeblock.stopEditing'),
        keybindings: [monaco.KeyCode.Escape],
        // Escape keeps closing Monaco's own widgets first.
        keybindingContext: '!suggestWidgetVisible && !findWidgetVisible && !parameterHintsVisible',
        run: () => stopEditingRef.current?.(),
      });
    },
    [t],
  );
}
