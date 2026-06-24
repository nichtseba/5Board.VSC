import { EditorElement } from './element';

/**
 * Raw webview -> extension message used to edit an element's data (e.g. heading text).
 *
/** */
export type UpdateElementMessage = {
  type: 'updateElement';
  id: string;
  changes: Partial<EditorElement>;
};

/** Type guard for {@link UpdateElementMessage} received over the raw webview channel. */
export function isUpdateElementMessage(msg: unknown): msg is UpdateElementMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: unknown }).type === 'updateElement' &&
    typeof (msg as { id?: unknown }).id === 'string'
  );
}
