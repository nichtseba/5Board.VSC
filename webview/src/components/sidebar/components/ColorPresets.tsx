export type ColorPreset = {
  value: string;
  label?: string;
  theme?: boolean;
};

type ColorPresetsProps = {
  color: string;
  onChange: (color: string) => void;
  presets: readonly (string | ColorPreset)[];
};

// Just the row of preset swatches
export function ColorPresets({ color, onChange, presets }: ColorPresetsProps) {
  const colorSelected = (preset: string) => color?.toLowerCase() === preset.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => {
        const value = typeof preset === 'string' ? preset : preset.value;
        const label = typeof preset === 'string' ? preset : (preset.label ?? preset.value);
        const title = typeof preset === 'string' || !preset.theme ? label : `Theme: ${label}`;

        return (
          <button
            key={value}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={colorSelected(value)}
            onClick={() => onChange(value)}
            className={`relative h-6 w-6 rounded-full border ${
              colorSelected(value)
                ? 'ring-2 ring-focus-border border-transparent'
                : 'border-foreground-description'
            }`}
            style={{ backgroundColor: value }}
          >
            {typeof preset !== 'string' && preset.theme ? (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-editor-background bg-editor-background px-0.5 text-[8px] font-semibold leading-none text-foreground">
                T
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
