export type ColorPreset = { value: string; label?: string };

type ColorPresetsProps = {
  color: string;
  onChange: (color: string) => void;
  presets: readonly ColorPreset[];
};

// Just the row of preset swatches; the label is shown on hover.
export function ColorPresets({ color, onChange, presets }: ColorPresetsProps) {
  const colorSelected = (value: string) => color.toLowerCase() === value.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          title={preset.label ?? preset.value}
          aria-pressed={colorSelected(preset.value)}
          onClick={() => onChange(preset.value)}
          className={`h-6 w-6 rounded-full border ${
            colorSelected(preset.value)
              ? 'ring-2 ring-focus-border border-transparent'
              : 'border-foreground-description'
          }`}
          style={{ backgroundColor: preset.value }}
        />
      ))}
    </div>
  );
}
