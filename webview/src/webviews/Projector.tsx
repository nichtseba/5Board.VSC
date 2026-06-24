import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { BoardDocument } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';

// The projector view shows the same canvas as the editor,
// but is read-only and display-only — no interactive controls.
export default function Projector() {
  const messages = useMessageService();
  const { t } = useLocalization();
  // boardDocument is null until the extension sends the initial 'init' message.
  const [boardDocument, setBoardDocument] = useState<BoardDocument | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  // Mirrors the editor's selected element so the projector highlights the same one.
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Tell the extension that this webview is ready to receive messages.
  // The extension will respond with 'init' and 'cursorTrackingChanged'.
  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useEffect(() => {
    const sendViewport = () => {
      const canvas = document.querySelector('.editor-canvas') as HTMLElement | null;

      if (!canvas) {
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();

      messages.send({
        type: 'updateViewport',
        viewport: {
          // Sichtbarer Bereich innerhalb des Canvas
          top: Math.max(0, -canvasRect.top),
          left: Math.max(0, -canvasRect.left),

          // Größe des sichtbaren Fensters
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });
    };

    window.addEventListener('scroll', sendViewport, { passive: true });
    window.addEventListener('resize', sendViewport);

    sendViewport();

    return () => {
      window.removeEventListener('scroll', sendViewport);
      window.removeEventListener('resize', sendViewport);
    };
  }, [messages]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);
  // Listen for messages from the extension host.
  useOnMessage((msg) => {
    if (msg.type === 'init' || msg.type === 'updateDocument') {
      // Replace the displayed document whenever the extension sends fresh data.
      setBoardDocument(msg.document);
    }
    if (msg.type === 'cursorMove') {
      setCursor({ x: msg.x, y: msg.y });
    }
    if (msg.type === 'cursorHide') {
      // Mouse left the editor canvas — remove the dot.
      setCursor(null);
    }
    if (msg.type === 'cursorTrackingChanged') {
      // If tracking was just disabled, clear any lingering cursor dot.
      if (!msg.enabled) {
        setCursor(null);
      }
    }
    if (msg.type === 'selectElement') {
      setSelectedElementId(msg.elementId);
    }
    if (msg.type === 'scroll') {
      const canvas = document.querySelector('.editor-canvas') as HTMLElement | null;
      const canvasRect = canvas?.getBoundingClientRect();

      window.scrollTo({
        top: Math.max(0, (canvasRect?.top ?? 0) + window.scrollY + msg.top),
        left: Math.max(0, (canvasRect?.left ?? 0) + window.scrollX + msg.left),
      });
    }
  });

  return (
    <div>
      {/* Projector badge — display only, no interactive elements */}
      <div
        style={{
          background: 'var(--vscode-badge-background)',
          color: 'var(--vscode-badge-foreground)',
          padding: '4px 12px',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        📽 {t('extension.projector.title')} — {boardDocument?.manifest.title ?? ''}
      </div>
      {/*
        Pass the live cursor position directly into EditorCanvas so the overlay
        is rendered inside the canvas div and positioned against the same grid
        that the editor uses to calculate coordinates. This guarantees the dot
        lands on the same element regardless of window size differences.

        selectedElementId from extension messages is passed as an external override
        so the projector always mirrors the editor's selection (not the projector
        user's own clicks).
      */}
      <div>
        {boardDocument ? (
          <CanvasEventsProvider>
            <EditorCanvas
              document={boardDocument}
              cursor={cursor}
              selectedElementId={selectedElementId}
            />
          </CanvasEventsProvider>
        ) : (
          // Shown while waiting for the first 'init' message from the extension.
          <div style={{ padding: '1rem', opacity: 0.5 }}>Loading…</div>
        )}
      </div>
    </div>
  );
}

init(Projector);
