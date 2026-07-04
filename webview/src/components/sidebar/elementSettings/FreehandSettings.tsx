import {
  DEFAULT_FREEHAND_PARAMETERS,
  EditorElement,
  EditorElementType,
  FREEHAND_COLORS,
  FREEHAND_MAX_WIDTH,
  FREEHAND_MIN_WIDTH,
} from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import ColorSelector from '../components/ColorSelector';
import SliderInput from '../components/SliderInput';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';

type Props = {
  element: EditorElement<EditorElementType.Freehand>;
};

// Settings for a drawn freehand element. Color/width live per stroke,
// opacity on the element style. Each change pushes an 'updateElement'.
export function FreehandSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const firstStroke = element.data.strokes[0];
  const color = firstStroke?.color ?? DEFAULT_FREEHAND_PARAMETERS.color;
  const width = firstStroke?.width ?? DEFAULT_FREEHAND_PARAMETERS.width;
  const opacity = element.style.opacity ?? DEFAULT_FREEHAND_PARAMETERS.opacity;

  // Apply a stroke patch to all strokes and push the update.
  const patchStrokes = (patch: { color?: string; width?: number }) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: { data: { strokes: element.data.strokes.map((s) => ({ ...s, ...patch })) } },
    });
  };

  const handleOpacity = (value: number) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: { style: { ...element.style, opacity: value } },
    });
  };

  return (
    <SettingsPanel title={t('webview.sidebar-element-settings.freehandSettings.title')} icon="pencil">
      <div className="flex flex-col gap-4">
        <ColorSelector
          color={color}
          onChange={(c) => patchStrokes({ color: c })}
          presets={FREEHAND_COLORS.map((c) => c.value)}
          label={t('webview.sidebar.freehand.color')}
          customColorLabel={t('webview.sidebar.freehand.customColor')}
        />

        <SliderInput
          label={t('webview.sidebar.freehand.width')}
          value={width}
          min={FREEHAND_MIN_WIDTH}
          max={FREEHAND_MAX_WIDTH}
          step={1}
          unit="px"
          onChange={(w) => patchStrokes({ width: w })}
        />

        {/* Opacity slider in percent (0–100%). Stored as opacity (0..1). */}
        <SliderInput
          label={t('webview.sidebar.freehand.opacity')}
          value={Math.round(opacity * 100)}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(value) => handleOpacity(value / 100)}
        />
      </div>
    </SettingsPanel>
  );
}
