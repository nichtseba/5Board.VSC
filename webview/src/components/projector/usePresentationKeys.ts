import { useEffect } from 'react';
import { useMessageService } from '../../services/MessageService';

// Keys that step through the reveal order. Page Up/Down are what most presenter clickers send.
const NEXT_KEYS = new Set(['ArrowRight', 'PageDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'PageUp']);

/**
 * Steps through the reveal order with the arrow keys while `enabled` is set.
 * Keys typed into text fields or while editing an element are left alone.
 */
export function usePresentationKeys(enabled: boolean) {
  const messages = useMessageService();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)))
      ) {
        return;
      }

      if (NEXT_KEYS.has(event.key)) {
        event.preventDefault();
        messages.send({ type: 'revealNext' });
      } else if (PREVIOUS_KEYS.has(event.key)) {
        event.preventDefault();
        messages.send({ type: 'unrevealNext' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, messages]);
}
