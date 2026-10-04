export type ColorPreset = {
  id: string;
  value: string;
  label?: string;
  theme?: boolean;
};

type ColorPresetsProps = {
  color?: string;
  onChange: (color: string | undefined) => void;
  presets: readonly (string | ColorPreset)[];
  allowNone?: boolean;
  noneLabel?: string;
  themeLabel?: string;
  presetLabels?: Record<string, string>;
};

// Just the row of preset swatches; the label is shown on hover.
export function ColorPresets({
  color,
  onChange,
  presets,
  allowNone = false,
  noneLabel = 'Keine Farbe',
  themeLabel = 'Theme',
  presetLabels,
}: ColorPresetsProps) {
  const colorSelected = (preset: string) => color?.toLowerCase() === preset.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowNone && (
        <button
          type="button"
          title={noneLabel}
          aria-label={noneLabel}
          aria-pressed={color === undefined}
          onClick={() => onChange(undefined)}
          className={`relative h-6 w-6 overflow-hidden rounded-full border border-foreground-description ${color === undefined ? 'ring-2 ring-focus-border border-transparent' : ''}`}
        >
          <span className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rotate-135 bg-activity-error-badge-background" />
        </button>
      )}

      {presets.map((preset) => {
        const value = typeof preset === 'string' ? preset : preset.value;
        const label =
          typeof preset === 'string'
            ? preset
            : (presetLabels?.[preset.id] ?? preset.label ?? preset.id);
        const title =
          typeof preset === 'string' || !preset.theme ? label : `${themeLabel}: ${label}`;

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
