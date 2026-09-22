import { ColorPicker } from './ColorPicker';
import { ColorPreset, ColorPresets } from './ColorPresets';
import { useSettings } from '../../../providers/SettingsProvider';
import { useState } from 'react';

type ColorSelectorProps = {
  color?: string;
  onChange: (color: string) => void;
  presets?: readonly (string | ColorPreset)[];
  themePresets?: readonly ColorPreset[];
  label?: string;
  customColorLabel?: string;
  themeLabel?: string;
};

// Generic colour picker with optional preset swatches
export default function ColorSelector({
  color,
  onChange,
  presets,
  themePresets,
  label,
  customColorLabel,
  themeLabel = 'Theme',
}: ColorSelectorProps) {
  const settings = useSettings();

  const customColors = settings.colorPalette.customColors;
  const [pickerColor, setPickerColor] = useState('#000000');

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-foreground-description">{label}</span>}
      {presets && presets.length > 0 && (
        <ColorPresets color={color} onChange={onChange} presets={presets} />
      )}
      {themePresets && themePresets.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-foreground-description">{themeLabel}</span>
          <ColorPresets
            color={color}
            onChange={onChange}
            presets={themePresets.map((preset) => ({ ...preset, theme: true }))}
          />
        </div>
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
          onChange={(newColor) => {
            setPickerColor(newColor);
            onChange(newColor);
          }}
        />
      </div>
    </div>
  );
}
