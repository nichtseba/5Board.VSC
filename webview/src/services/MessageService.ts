import { createContext, useContext, useEffect, useRef } from 'react';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '5board.vsc-common';
import { vscodeApi } from '../components/VsCode';

type Handler = (msg: ExtensionToWebviewMessage) => void;

export class MessageService {
  private handlers = new Set<Handler>();

  constructor(private vscode: { postMessage(msg: unknown): void }) {
    window.addEventListener('message', (event: MessageEvent<ExtensionToWebviewMessage>) => {
      this.handlers.forEach((h) => h(event.data));
    });
  }

  /** Send a message to the extension host. */
  send(msg: WebviewToExtensionMessage): void {
    if (msg.type === 'selectElements' && msg.ids.length === 0) {
      console.log('[Message Debug] Empty selection sent');
      console.log(new Error().stack);
    }

    this.vscode.postMessage(msg);
  }

  /** Register a handler for messages from the extension. Returns an unsubscribe fn. */
  on(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

// One instance per webview bundle — shares the single vscodeApi instance
const service = new MessageService(vscodeApi);

export const MessageServiceContext = createContext(service);

export function useMessageService(): MessageService {
  return useContext(MessageServiceContext);
}

/**
 * Hook: subscribe to messages from the extension.
 * The handler is always up-to-date (via ref) without re-subscribing.
 */
export function useOnMessage(handler: Handler): void {
  const svc = useMessageService();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => svc.on((msg) => ref.current(msg)), [svc]);
}
