import { useCanvasEvents } from '../../providers/CanvasEventsProvider';
import { useMessageService } from '../../services/MessageService';

export function useCanvasSelection() {
  const messages = useMessageService();

  useCanvasEvents({
    pointerDown: (event) => {
      if (event.button !== 0) return;

      const target = event.target;

      if (!(target instanceof HTMLElement)) return;

      const element = target.closest('[data-editor-element]');

      if (element) {
        return;
      }

      messages.send({
        type: 'selectElements',
        ids: [],
      });
    },
  });
}
