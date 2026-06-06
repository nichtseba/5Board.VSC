import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { BoardDocument } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';

export default function Editor() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [document, setDocument] = useState<BoardDocument | null>(null);
  // Cursor tracking starts OFF (matches the extension's default) for performance.
  // The extension confirms the actual state via 'cursorTrackingChanged' on ready.
  const [cursorTrackingEnabled, setCursorTrackingEnabled] = useState(false);

  // Called by EditorCanvas with canvas-relative (0–1) coordinates.
  // Only fires when tracking is enabled (onCursorMove is only passed when enabled).
  const handleCursorMove = (x: number, y: number) => {
    console.log(`Mouse Position: (${x}, ${y})`); // dev tools
    messages.send({ type: 'cursorMove', x, y });
  };

  // Called when the mouse leaves the canvas; always sent regardless of tracking state
  // so the projector can clear the cursor dot even if tracking was just toggled on.
  const handleCursorLeave = () => {
    messages.send({ type: 'cursorLeave' });
  };

  // Called when the user clicks an element in the canvas.
  const handleElementSelect = (id: string | null) => {
    messages.send({ type: 'selectElement', elementId: id });
  };

  // Sends a toggle request to the extension, which flips the state and broadcasts
  // 'cursorTrackingChanged' back to all panels (including this editor).
  const handleToggleCursorTracking = () => {
    messages.send({ type: 'toggleCursorTracking' });
  };

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const top = window.document.documentElement.scrollTop;
      const left = window.document.documentElement.scrollLeft;

      messages.send({
        type: 'scroll',
        top,
        left,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useOnMessage((msg) => {
    console.log('Received message in Editor:', msg.type);
    if (msg.type === 'updateDocument' || msg.type === 'init') {
      setDocument(msg.document);
    }
    if (msg.type === 'cursorTrackingChanged') {
      setCursorTrackingEnabled(msg.enabled);
    }
  });

  useEffect(() => {
    const setFocus = () => {
      messages.send({ type: 'focus' });
    };
    window.addEventListener('focus', setFocus);
    return () => {
      window.removeEventListener('focus', setFocus);
    };
  }, []);

  return (
    <>
      <p>
        Document: <code>{JSON.stringify(document, null, 2)}</code>
      </p>

      {/* Cursor tracking toggle — shown in the editor toolbar area */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
        <button
          onClick={handleToggleCursorTracking}
          style={{
            padding: '3px 10px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            border: '1px solid var(--vscode-button-border, currentColor)',
            borderRadius: '3px',
            background: cursorTrackingEnabled
              ? 'var(--vscode-button-background)'
              : 'var(--vscode-button-secondaryBackground)',
            color: cursorTrackingEnabled
              ? 'var(--vscode-button-foreground)'
              : 'var(--vscode-button-secondaryForeground)',
          }}
        >
          {cursorTrackingEnabled
            ? t('extension.projector.cursorTrackingOn')
            : t('extension.projector.cursorTrackingOff')}
        </button>
      </div>

      <div>
        {document && (
          <EditorCanvas
            document={document}
            // Pass onCursorMove only when tracking is enabled.
            // When undefined, EditorCanvas skips rAF entirely — no CPU cost.
            onCursorMove={cursorTrackingEnabled ? handleCursorMove : undefined}
            onCursorLeave={handleCursorLeave}
            onElementSelect={handleElementSelect}
          />
        )}
      </div>
    </>
  );
}

init(Editor);
