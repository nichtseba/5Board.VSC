import { ColorPicker } from './ColorPicker';
import { ColorPreset, ColorPresets } from './ColorPresets';
import { useSettings } from '../../../providers/SettingsProvider';
import { useState } from 'react';

export type ColorSelectorProps = {
  color?: string;
  onChange: (color: string | undefined) => void;
  allowNone?: boolean;
  presets?: readonly (string | ColorPreset)[];
  label?: string;
  customColorLabel?: string;
  themeLabel?: string;
  pickerTitle?: string;
  noColorLabel?: string;
  presetLabels?: Record<string, string>;
};

// Generic colour picker with optional preset swatches
export default function ColorSelector({
  color,
  onChange,
  allowNone = false,
  presets,
  label,
  customColorLabel,
  themeLabel,
  pickerTitle,
  noColorLabel,
  presetLabels,
}: ColorSelectorProps) {
  const settings = useSettings();

  const customColors = settings.colorPalette.customColors;
  const [pickerColor, setPickerColor] = useState('#000000');

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-foreground-description">{label}</span>}
      {presets && presets.length > 0 && (
        <ColorPresets
          color={color}
          onChange={onChange}
          presets={presets}
          allowNone={allowNone}
          noneLabel={noColorLabel}
          themeLabel={themeLabel}
          presetLabels={presetLabels}
        />
      )}
      <div className="flex flex-col gap-1">
        {customColorLabel && (
          <span className="text-xs uppercase text-foreground-description">{customColorLabel}</span>
        )}
        {customColors.length > 0 && (
          <ColorPresets color={color} onChange={onChange} presets={customColors} />
        )}
        <ColorPicker
          color={pickerColor}
          title={pickerTitle}
          onChange={(newColor) => {
            setPickerColor(newColor);
            onChange(newColor);
          }}
        />
      </div>
    </div>
  );
}
