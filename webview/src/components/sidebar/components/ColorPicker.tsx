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
