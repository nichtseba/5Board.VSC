interface FontSizeInputProps {
  value: number | '';
  min?: number;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  label?: string;
}

export function FontSizeInput({ value, min = 1, onChange, onConfirm, label }: FontSizeInputProps) {
  return (
    <>
      {label && <span className="text-foreground-description">{label}</span>}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm?.();
          }
        }}
        className="
        w-20 rounded-xs
        border border-dropdown-border
        bg-input-background
        px-2 py-[3px]
        text-input-foreground
        [color-scheme:light_dark]
        focus:border-focus-border
        focus:outline-none
        [&::-webkit-inner-spin-button]:opacity-50
        [&::-webkit-outer-spin-button]:opacity-50
      "
      />
    </>
  );
}
