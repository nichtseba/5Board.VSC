import { useEffect, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { DEFAULT_PROJECTOR_POINTER_STYLE, ProjectorPointerStyle } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';
import { FreehandPreview } from '../components/canvas/tools/FreehandPreviewOverlay';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';
import { SourcesProvider } from '../providers/SourcesProvider';
import { ExecutionOutputProvider } from '../providers/ExecutionOutputProvider';
import { ViewTypeProvider } from '../providers/ViewTypeProvider';

// The projector view shows the same canvas as the editor,
// but is read-only and display-only — no interactive controls.
export default function Projector() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const boardDocument = useBoardDocument();
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  // Cursor appearance, configured from the sidebar and pushed by the extension.
  const [pointerStyle, setPointerStyle] = useState<ProjectorPointerStyle>(
    DEFAULT_PROJECTOR_POINTER_STYLE,
  );
  // Live freehand stroke the editor is currently drawing (cleared when finished).
  const [freehandPreview, setFreehandPreview] = useState<FreehandPreview | null>(null);
  // Frozen state: mirroring is on hold
  const [paused, setPaused] = useState(false);

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
          // Visible arria inside the canvas
          top: Math.max(0, -canvasRect.top),
          left: Math.max(0, -canvasRect.left),

          // Size of the wisible window
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
    // Re-run once the canvas mounts, so the initial viewport sends right away.
  }, [messages, !!boardDocument]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'cursorMove') {
      setCursor({ x: msg.x, y: msg.y });
    }
    if (msg.type === 'cursorHide') {
      setCursor(null);
    }
    if (msg.type === 'projectorStateChanged') {
      setPaused(msg.paused);
      // If mirroring was just turned off, clear any lingering cursor dot.
      if (!msg.active) {
        setCursor(null);
      }
      // Drop a half-drawn stroke so it does not stick around while paused.
      if (msg.paused) {
        setFreehandPreview(null);
      }
    }
    if (msg.type === 'projectorPointerChanged') {
      setPointerStyle(msg.style);
    }
    if (msg.type === 'freehandPreview') {
      setFreehandPreview({
        points: msg.points,
        color: msg.color,
        width: msg.width,
        opacity: msg.opacity,
        lineStyle: msg.lineStyle,
        dashScale: msg.dashScale,
        straight: msg.straight,
      });
    }
    if (msg.type === 'freehandPreviewEnd') {
      setFreehandPreview(null);
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
    <ViewTypeProvider value={'projector'}>
      <div>
        {/* Projector badge — display only, no interactive elements */}
        <div
          style={{
            background: paused
              ? 'var(--vscode-statusBarItem-warningBackground, #cca700)'
              : 'var(--vscode-badge-background)',
            color: paused
              ? 'var(--vscode-statusBarItem-warningForeground, #000000)'
              : 'var(--vscode-badge-foreground)',
            padding: '4px 12px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {t('extension.projector.title')} — {boardDocument?.manifest.title ?? ''} ·{' '}
          {paused ? t('extension.projector.paused') : t('extension.projector.live')}
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
        {/*
        Beamer view: display only. pointerEvents:'none' aka no interactive controls.
      */}
        <div style={{ pointerEvents: 'none' }}>
          {boardDocument ? (
            // Mirrors code block output live, but read-only: input belongs to the editor
            // window, so two windows can never write into the same program.
            <ExecutionOutputProvider readOnly>
              {/* Same SourcesProvider as the editor, without it every CodeElement shows
                  "Source not found". */}
              <SourcesProvider value={boardDocument.sources}>
                <CanvasEventsProvider>
                  <EditorCanvas
                    enableKeyboardShortcuts={false}
                    cursor={cursor}
                    pointerStyle={pointerStyle}
                    freehandPreview={freehandPreview}
                  />
                </CanvasEventsProvider>
              </SourcesProvider>
            </ExecutionOutputProvider>
          ) : (
            // Shown while waiting for the first 'init' message from the extension.
            <div style={{ padding: '1rem', opacity: 0.5 }}>{t('extension.projector.loading')}</div>
          )}
        </div>
      </div>
    </ViewTypeProvider>
  );
}

init(Projector);
