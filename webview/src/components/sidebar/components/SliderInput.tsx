type SliderInputProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  // Optional unit appended to the value readout (e.g. "px", "%").
  unit?: string;
};

// Generic labelled range slider with a live value readout. Reusable for any
// numeric setting (stroke width, opacity, …).
export default function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
}: SliderInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-description">{label}</span>
        <span className="text-xs tabular-nums opacity-70">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-focus-border"
      />
    </div>
  );
}
