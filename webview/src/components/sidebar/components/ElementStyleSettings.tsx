import {
  ElementStyle,
  FREEHAND_COLORS,
  FREEHAND_LINE_STYLES,
  FREEHAND_MAX_WIDTH,
  FREEHAND_MIN_WIDTH,
  LineStyle,
  TranslationKey,
} from '5board.vsc-common';
import ColorSelector from './ColorSelector';
import LineStyleSelect from './LineStyleSelect';
import SliderInput from './SliderInput';
import { useLocalization } from '../../../providers/LocalizationProvider';

type Props = {
  style: ElementStyle;
  onChange: (changes: Partial<ElementStyle>) => void;
  allowNone?: boolean;
  /** Controls which individual style controls are displayed. Defaults to all. */
  editableProperties?: readonly ElementStyleEditableProperty[];
};

export type ElementStyleEditableProperty =
  | 'color'
  | 'backgroundColor'
  | 'opacity'
  | 'borderColor'
  | 'borderWidth'
  | 'borderRadius'
  | 'borderStyle';

const BORDER_LINE_STYLES = FREEHAND_LINE_STYLES.filter(({ id }) => id !== 'custom');

export default function ElementStyleSettings({
  style,
  onChange,
  allowNone = false,
  editableProperties,
}: Props) {
  const { t } = useLocalization();
  const color = style.color;
  const backgroundColor = style.backgroundColor;
  const border = style.border ?? {};
  const borderColor = border.color;
  const borderWidth = border.width ?? 2;
  const borderRadius = border.radius ?? 0;
  const borderStyle = border.style ?? 'solid';
  const opacity = style.opacity ?? 1;
  const isEditable = (property: ElementStyleEditableProperty) =>
    !editableProperties || editableProperties.includes(property);

  const updateBorder = (changes: NonNullable<ElementStyle['border']>) =>
    onChange({ border: { ...border, ...changes } });

  const colorPresets = FREEHAND_COLORS.map((preset) => ({
    id: preset.id,
    value: preset.value,
    label: t(`webview.sidebar.freehand.colors.${preset.id}` as TranslationKey),
  }));

  return (
    <div className="flex flex-col gap-4">
      {isEditable('color') && (
        <ColorSelector
          color={color}
          onChange={(value) => onChange({ color: value })}
          presets={colorPresets}
          label={t('webview.sidebar.freehand.color')}
          customColorLabel={t('webview.sidebar.freehand.customColor')}
        />
      )}

      {isEditable('backgroundColor') && (
        <ColorSelector
          color={backgroundColor}
          allowNone={allowNone}
          onChange={(value) => onChange({ backgroundColor: value })}
          presets={colorPresets}
          label={t('webview.sidebar-element-settings.headingSettings.backgroundColor')}
          customColorLabel={t('webview.sidebar.freehand.customColor')}
        />
      )}

      {isEditable('opacity') && (
        <SliderInput
          label={t('webview.sidebar.freehand.opacity')}
          value={Math.round(opacity * 100)}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(value) => onChange({ opacity: value / 100 })}
        />
      )}

      {isEditable('borderColor') && (
        <ColorSelector
          color={borderColor}
          allowNone={allowNone}
          onChange={(value) => updateBorder({ color: value })}
          presets={colorPresets}
          label={t('webview.sidebar-element-settings.lineSettings.borderColor')}
          customColorLabel={t('webview.sidebar.freehand.customColor')}
        />
      )}

      {isEditable('borderWidth') && (
        <SliderInput
          label={t('webview.sidebar-element-settings.lineSettings.borderWidth')}
          value={borderWidth}
          min={FREEHAND_MIN_WIDTH}
          max={FREEHAND_MAX_WIDTH}
          unit="px"
          onChange={(value) => updateBorder({ width: value })}
        />
      )}

      {isEditable('borderRadius') && (
        <SliderInput
          label={t('webview.sidebar-element-settings.lineSettings.borderRadius')}
          value={borderRadius}
          min={0}
          max={10}
          step={0.5}
          unit="px"
          onChange={(value) => updateBorder({ radius: value })}
        />
      )}

      {isEditable('borderStyle') && (
        <LineStyleSelect
          label={t('webview.sidebar-element-settings.lineSettings.borderStyle')}
          value={borderStyle as LineStyle}
          options={BORDER_LINE_STYLES.map((styleOption) => ({
            id: styleOption.id,
            label: t(`webview.sidebar.freehand.lineStyles.${styleOption.id}` as TranslationKey),
          }))}
          onChange={(value) => updateBorder({ style: value })}
        />
      )}
    </div>
  );
}
