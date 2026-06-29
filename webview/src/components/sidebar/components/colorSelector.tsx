type ColorPickerProps = {
  color: string;
  onChange: (color: string) => void;
  // Optional caption shown next to the native picker.
  label?: string;
};

// Just the native colour input (+ optional label)
export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="color"
        // Native picker needs a hex value; a preset token (var(--…)) can't be shown there.
        value={color.startsWith('#') ? color : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-foreground-description bg-transparent p-0"
      />
      {label && <span className="text-foreground-description">{label}</span>}
    </label>
  );
}

type ColorPresetsProps = {
  color: string;
  onChange: (color: string) => void;
  presets: readonly string[];
};

// Just the row of preset swatches
export function ColorPresets({ color, onChange, presets }: ColorPresetsProps) {
  const colorSelected = (preset: string) => color.toLowerCase() === preset.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          title={preset}
          aria-pressed={colorSelected(preset)}
          onClick={() => onChange(preset)}
          className={`h-6 w-6 rounded-full border ${
            colorSelected(preset)
              ? 'ring-2 ring-focus-border border-transparent'
              : 'border-foreground-description'
          }`}
          style={{ backgroundColor: preset }}
        />
      ))}
    </div>
  );
}

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
