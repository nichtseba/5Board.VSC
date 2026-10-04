import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageService } from '../../../../services/MessageService';

// Kept short: Ctrl+Shift+E runs the last-synced code, so a long debounce runs stale code.
const DEBOUNCE_MS = 200;

/**
 * Editor state of one block, synced to the extension with a debounce. `blockCode` is the block
 * as currently stored in its source (null while the source is missing).
 */
export function useBlockCodeSync(elementId: string, blockCode: string | null) {
  const messages = useMessageService();
  const [code, setCode] = useState(blockCode ?? '');

  const codeRef = useRef(code);
  codeRef.current = code;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const lastSentRef = useRef<string | null>(null);

  const flush = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingRef.current === null) return;

    lastSentRef.current = pendingRef.current;
    messages.send({ type: 'updateBlockCode', elementId, code: pendingRef.current });
    pendingRef.current = null;
  }, [messages, elementId]);

  const change = useCallback(
    (newCode: string) => {
      setCode(newCode);
      pendingRef.current = newCode;
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  // Only external edits (source edited as a file, block moved) may replace the editor content.
  // The echo of our own edit is usually stale by the time it arrives; adopting it would drop
  // what was typed meanwhile and move the caret.
  useEffect(() => {
    if (blockCode === null) return;
    if (blockCode === codeRef.current || blockCode === lastSentRef.current) return;
    setCode(blockCode);
  }, [blockCode]);

  return { code, change, flush };
}
