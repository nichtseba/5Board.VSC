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
    if (shape === 'duck') {
      return (
        <svg aria-hidden="true" className="size-5 shrink-0" viewBox="30 21 24 23">
          <path
            d="M48.89,30.53c-.7.13-.68.8-1.71,2.17-.04.05-.07.15-.07.2.01.7,2.92,1.16,4.31,3.43.95,1.55.91,3.85-.19,5.2-.68.84-1.6,1.23-2.7,1.46-3.23.67-6.1.64-12.3.09-3.41-.3-4.26-.53-5.13-1.27-1.96-1.66-1.95-4.3-1.96-5.33,0-.33.57-3.28,1.31-3.68.23-.13.44-.04.58,0,.33.1,1.35,1.11,2.05,1.36,1.58.56,5.74-.87,6.51-1.27.16-.08.27-.24.23-.51-.04-.33-.35-.65-.47-.84-.5-.82-1.5-2.93-.68-4.97.69-1.73,2.74-3.6,4.64-3.53,2.52.08,4.04,2.8,4.28,3.26.24.46.48.45"
            fill="#facc10"
            stroke="#ca8b0b"
            strokeWidth=".5"
            strokeLinejoin="round"
          />
          <path
            d="M50.54 28.74c-.12 0 .53-1.33.4-2-.05-.16-.47-.05-.54-.02-.25.09-.97.27-1.47.23-.64-.05-.91-.3-.95-.19-.02.06.19.44.13 1-.01.11 0 .58-.35.77-.32.18-.65.16-.93.38-.29.23-.33.96-.07 1.15.52.37 1.98.5 2.14.47.41-.07 1.38-.43 2.33-.96.06-.03.12-.2.08-.35-.08-.36-.72-.47-.77-.48Z"
            fill="#f39040"
          />
          <path
            d="M47.99 26.71s.3.19.94.24c.5.04 1.22-.14 1.47-.23.07-.03.48-.13.54.02-.14.68-.79 2-.4 2 .05 0 .69.12.77.48.03.15-.02.32-.08.35-.96.52-1.93.88-2.33.96M47.22 29.43c.28.1.89.27 1.65.12.91-.18 1.47-.7 1.67-.91"
            fill="none"
            stroke="#c34217"
            strokeWidth=".5"
            strokeLinecap="round"
          />
          <path
            d="M46.72 40.86c.4-1.11.03-2.46-.84-3.24-.58-.52-1.24-.66-1.72-.75-1.6-.3-2.09.42-3.96.51-2 .09-2.42-.71-3.57-.22-.86.37-1.67 1.25-1.77 2.37-.13 1.48 1.1 2.44 1.28 2.58.44.34.94.57 2.56.8 2.67.38 4.01.57 5.48 0 .83-.32 2.08-.8 2.53-2.06Z"
            fill="none"
            stroke="#eab30e"
            strokeWidth=".25"
          />
          <circle cx="45.81" cy="26.26" r=".52" fill="#1d1d1b" />
        </svg>
      );
    }
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
          presets={PROJECTOR_POINTER_PRESET_COLORS.map((c) => ({
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
