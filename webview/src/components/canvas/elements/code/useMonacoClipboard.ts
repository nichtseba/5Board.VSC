import { useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useMessageService, useOnMessage } from '../../../../services/MessageService';
import { useLocalization } from '../../../../providers/LocalizationProvider';

/**
 * Cut and paste for Monaco inside a webview, where the browser clipboard is not available:
 * both go through the extension. Returns a function to call from Monaco's `onMount`.
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
        id: '5board-cut',
        label: t('webview.codeblock.cut'),
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
        run: (ed) => {
          const cut = collectCut(ed);
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

/** An empty selection cuts its whole line, like Monaco's own `emptySelectionClipboard`. */
function collectCut(
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
