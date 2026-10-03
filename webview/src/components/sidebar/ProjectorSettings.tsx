import { useState } from 'react';
import { Checkbox } from 'vscrui';
import {
  DEFAULT_PROJECTOR_POINTER_STYLE,
  PROJECTOR_POINTER_PRESET_COLORS,
  ProjectorPointerShape,
  ProjectorPointerStyle,
  TranslationKey,
} from '5board.vsc-common';
import { useLocalization } from '../../providers/LocalizationProvider';
import { useMessageService, useOnMessage } from '../../services/MessageService';
import ColorSelector from './components/CompactColorSelector';

const SHAPES: { id: ProjectorPointerShape; labelKey: TranslationKey }[] = [
  { id: 'dot', labelKey: 'webview.sidebar.projectorSettings.shapes.dot' },
  { id: 'ring', labelKey: 'webview.sidebar.projectorSettings.shapes.ring' },
  { id: 'rectangle', labelKey: 'webview.sidebar.projectorSettings.shapes.rectangle' },
  { id: 'duck', labelKey: 'webview.sidebar.projectorSettings.shapes.duck' },
];

// Projector settings panel: cursor tracking toggle + mirrored cursor appearance
// (shape, colour, custom image). The whole appearance is one ProjectorPointerStyle
// object; any change pushes the full style and the extension echoes it back.
export default function ProjectorSettings() {
  const { t } = useLocalization();
  const messages = useMessageService();

  const [cursorTracking, setCursorTracking] = useState(true);
  const [paused, setPaused] = useState(false);
  // Whether a projector window is attached.
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<ProjectorPointerStyle>(DEFAULT_PROJECTOR_POINTER_STYLE);

  useOnMessage((msg) => {
    if (msg.type === 'cursorTrackingChanged') setCursorTracking(msg.enabled);
    if (msg.type === 'projectorStateChanged') {
      setPaused(msg.paused);
      setOpen(msg.open);
    }
    if (msg.type === 'projectorPointerChanged') setStyle(msg.style);
  });

  // Apply a partial change and push the full style to the extension (which echoes it back).
  const update = (patch: Partial<ProjectorPointerStyle>) => {
    const next = { ...style, ...patch };
    setStyle(next);
    messages.send({ type: 'updateProjectorPointer', style: next });
  };

  // Small live preview shown inside each shape button (uses the current colour).
  const renderPreview = (shape: ProjectorPointerShape) => {
    if (shape === 'duck') return <span className="text-base leading-none">🦆</span>;
    const isRing = shape === 'ring';
    const isRectangle = shape === 'rectangle';
    return (
      <span
        className={`h-3.5 w-3.5 border-2 ${isRectangle ? '' : 'rounded-full'}`}
        style={{ borderColor: style.color, backgroundColor: isRing ? 'transparent' : style.color }}
      />
    );
  };

  const isGeometric =
    style.shape === 'dot' || style.shape === 'ring' || style.shape === 'rectangle';

  return (
    <div className="flex flex-col gap-4">
      {/* Playback: one compact row — toggle button plus the current state. */}
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          disabled={!open}
          title={
            paused
              ? t('webview.sidebar.projectorSettings.resume')
              : t('webview.sidebar.projectorSettings.pause')
          }
          aria-label={
            paused
              ? t('webview.sidebar.projectorSettings.resume')
              : t('webview.sidebar.projectorSettings.pause')
          }
          aria-pressed={paused}
          onClick={() => messages.send({ type: 'toggleProjectorPaused' })}
          className="flex h-6 w-6 items-center justify-center rounded border border-foreground-description leading-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {paused ? '▶' : '⏸'}
        </button>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            backgroundColor: !open
              ? 'var(--vscode-descriptionForeground, #8a8a8a)'
              : paused
                ? 'var(--vscode-charts-yellow, #cca700)'
                : 'var(--vscode-charts-green, #89d185)',
          }}
        />
        <span className="text-foreground-description">
          {!open
            ? t('webview.sidebar.projectorSettings.statusClosed')
            : paused
              ? t('webview.sidebar.projectorSettings.statusPaused')
              : t('webview.sidebar.projectorSettings.statusLive')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => messages.send({ type: 'revealNext' })}
          className="rounded border border-foreground-description px-2 py-1 text-sm"
        >
          {t('webview.sidebar.projectorSettings.revealNext')}
        </button>
        <button
          type="button"
          onClick={() => messages.send({ type: 'unrevealNext' })}
          className="rounded border border-foreground-description px-2 py-1 text-sm"
        >
          {t('webview.sidebar.projectorSettings.unrevealNext')}
        </button>
        <button
          type="button"
          onClick={() => messages.send({ type: 'setAllElementsVisible', visible: true })}
          className="rounded border border-foreground-description px-2 py-1 text-sm"
        >
          {t('webview.sidebar.projectorSettings.showAll')}
        </button>
        <button
          type="button"
          onClick={() => messages.send({ type: 'setAllElementsVisible', visible: false })}
          className="rounded border border-foreground-description px-2 py-1 text-sm"
        >
          {t('webview.sidebar.projectorSettings.hideAll')}
        </button>
      </div>

      <Checkbox
        checked={cursorTracking}
        onChange={() => messages.send({ type: 'toggleCursorTracking' })}
      >
        {t('webview.sidebar.projectorSettings.cursorTracking')}
      </Checkbox>

      {/* Shape selector */}
      <div className="flex flex-col gap-2">
        <span className="text-foreground-description">
          {t('webview.sidebar.projectorSettings.pointerShape')}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              title={t(s.labelKey)}
              aria-pressed={style.shape === s.id}
              onClick={() => update({ shape: s.id })}
              className={`flex h-8 w-8 items-center justify-center rounded border ${
                style.shape === s.id
                  ? 'ring-2 ring-focus-border border-transparent'
                  : 'border-foreground-description'
              }`}
            >
              {renderPreview(s.id)}
            </button>
          ))}
        </div>
      </div>

      {/* Colour — only relevant for the geometric shapes */}
      {isGeometric && (
        <ColorSelector
          color={style.color}
          onChange={(color) => update({ color })}
          themePresets={PROJECTOR_POINTER_PRESET_COLORS.map((c) => ({
            id: c.id,
            value: c.value,
            label: t(`webview.sidebar.projectorSettings.colors.${c.id}` as TranslationKey),
          }))}
          label={t('webview.sidebar.projectorSettings.pointerColor')}
          customColorLabel={t('webview.sidebar.projectorSettings.customColor')}
        />
      )}
    </div>
  );
}
