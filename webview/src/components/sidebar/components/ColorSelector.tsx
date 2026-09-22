import { ColorPicker } from './ColorPicker';
import { ColorPreset, ColorPresets } from './ColorPresets';

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
      <ColorPicker color={color} onChange={onChange} label={customColorLabel} />
    </div>
  );
}
