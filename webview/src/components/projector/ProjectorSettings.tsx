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
  const [style, setStyle] = useState<ProjectorPointerStyle>(DEFAULT_PROJECTOR_POINTER_STYLE);

  useOnMessage((msg) => {
    if (msg.type === 'cursorTrackingChanged') setCursorTracking(msg.enabled);
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
  const colorSelected = (color: string) => style.color.toLowerCase() === color.toLowerCase();

  return (
    <div className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-2">
          <span className="text-foreground-description">
            {t('webview.sidebar.projectorSettings.pointerColor')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {PROJECTOR_POINTER_PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-pressed={colorSelected(color)}
                onClick={() => update({ color })}
                className={`h-6 w-6 rounded-full border ${
                  colorSelected(color)
                    ? 'ring-2 ring-focus-border border-transparent'
                    : 'border-foreground-description'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="color"
              // Native picker needs a hex value; a preset token (var(--…)) can't be shown there.
              value={style.color.startsWith('#') ? style.color : '#000000'}
              onChange={(e) => update({ color: e.target.value })}
              className="h-6 w-6 cursor-pointer rounded border border-foreground-description bg-transparent p-0"
            />
            <span className="text-foreground-description">
              {t('webview.sidebar.projectorSettings.customColor')}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
