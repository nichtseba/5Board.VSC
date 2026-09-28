import { ColorPicker } from './ColorPicker';
import { ColorPreset, ColorPresets } from './ColorPresets';
import { useSettings } from '../../../providers/SettingsProvider';
import { useState } from 'react';

type ColorSelectorProps = {
  color?: string;
  onChange: (color: string | undefined) => void;
  allowNone?: boolean;
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
  allowNone = false,
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
        <ColorPresets color={color} onChange={onChange} presets={presets} allowNone={allowNone} />
      )}
      {themePresets && themePresets.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-foreground-description">{themeLabel}</span>
          <ColorPresets
            color={color}
            onChange={onChange}
            presets={themePresets.map((preset) => ({ ...preset, theme: true }))}
            allowNone={allowNone}
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        {customColorLabel && (
          <span className="text-xs uppercase text-foreground-description">{customColorLabel}</span>
        )}
        {customColors.length > 0 && (
          <ColorPresets
            color={color}
            onChange={onChange}
            presets={customColors}
            allowNone={allowNone}
          />
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
