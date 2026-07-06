import { ColorPicker } from './ColorPicker';
import { ColorPresets } from './ColorPresets';

type ColorSelectorProps = {
  color: string;
  onChange: (color: string) => void;
  presets?: readonly string[];
  label?: string;
  customColorLabel?: string;
};

// Generic colour picker with optional preset swatches
export default function ColorSelector({
  color,
  onChange,
  presets,
  label,
  customColorLabel,
}: ColorSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-foreground-description">{label}</span>}
      {presets && presets.length > 0 && (
        <ColorPresets color={color} onChange={onChange} presets={presets} />
      )}
      <ColorPicker color={color} onChange={onChange} label={customColorLabel} />
    </div>
  );
}
