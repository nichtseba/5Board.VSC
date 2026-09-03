type ColorPresetsProps = {
  color?: string;
  onChange?: (color: string) => void;
  presets: readonly string[];
};

// Just the row of preset swatches
export function ColorPresets({ color, onChange, presets }: ColorPresetsProps) {
  const colorSelected = (preset: string) => color?.toLowerCase() === preset.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          title={preset}
          aria-pressed={colorSelected(preset)}
          onClick={() => onChange?.(preset)}
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
