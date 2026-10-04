import { useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useMessageService, useOnMessage } from '../../../../services/MessageService';
import { useLocalization } from '../../../../providers/LocalizationProvider';

/**
 * Copy, cut and paste for Monaco inside a webview, where the browser clipboard is not available:
 * all go through the extension. Copy needs its own action because Monaco binds `Ctrl+C` only in
 * Electron; in a webview the key would reach the canvas shortcut and copy the element instead.
 * Returns a function to call from Monaco's `onMount`.
 */
export function useMonacoClipboard() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const pendingPasteRef = useRef<((text: string) => void) | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'clipboardContent' && pendingPasteRef.current) {
      pendingPasteRef.current(msg.text);
      pendingPasteRef.current = null;
    }
  });

  return useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editor.addAction({
        id: '5board-copy',
        label: t('webview.codeblock.copy'),
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
        run: (ed) => {
          const copied = collectSelection(ed);
          if (!copied) return;
          messages.send({ type: 'copyToClipboard', text: copied.text });
        },
      });

      editor.addAction({
        id: '5board-cut',
        label: t('webview.codeblock.cut'),
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
        run: (ed) => {
          const cut = collectSelection(ed);
          if (!cut) return;
          messages.send({ type: 'copyToClipboard', text: cut.text });
          ed.pushUndoStop();
          ed.executeEdits(
            '5board-cut',
            cut.ranges.map((range) => ({ range, text: '' })),
          );
          ed.pushUndoStop();
        },
      });

      editor.addAction({
        id: '5board-paste',
        label: t('webview.codeblock.paste'),
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
        run: (ed) => {
          // 'paste' keeps the text as is; 'type' would auto-indent every pasted line.
          pendingPasteRef.current = (text) => ed.trigger('keyboard', 'paste', { text });
          messages.send({ type: 'requestClipboard' });
        },
      });
    },
    [messages, t],
  );
}

/**
 * Text and ranges for copy/cut. An empty selection takes its whole line, like Monaco's own
 * `emptySelectionClipboard`.
 */
function collectSelection(
  editor: monaco.editor.ICodeEditor,
): { text: string; ranges: monaco.IRange[] } | null {
  const model = editor.getModel();
  const selections = editor.getSelections();
  if (!model || !selections?.length) return null;

  const eol = model.getEOL();
  const lineCount = model.getLineCount();
  const parts: string[] = [];
  const ranges: monaco.IRange[] = [];

  for (const selection of selections) {
    if (!selection.isEmpty()) {
      parts.push(model.getValueInRange(selection));
      ranges.push(selection);
      continue;
    }
    const line = selection.startLineNumber;
    parts.push(model.getLineContent(line) + eol);
    if (line < lineCount) {
      ranges.push(new monaco.Range(line, 1, line + 1, 1));
    } else if (line > 1) {
      ranges.push(
        new monaco.Range(
          line - 1,
          model.getLineMaxColumn(line - 1),
          line,
          model.getLineMaxColumn(line),
        ),
      );
    } else {
      ranges.push(new monaco.Range(line, 1, line, model.getLineMaxColumn(line)));
    }
  }

  return { text: parts.join(selections.length > 1 ? eol : ''), ranges };
}
