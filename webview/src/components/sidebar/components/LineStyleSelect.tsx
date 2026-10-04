import { LineStyle } from '5board.vsc-common';
import { Button } from 'vscrui';

type LineStyleSelectProps = {
  value: LineStyle;
  onChange: (value: LineStyle) => void;
  // Localized options (id + label) provided by the caller.
  options: readonly { id: LineStyle; label: string }[];
  label?: string;
};

// CSS border styles that can be shown as a line preview; others fall back to text.
const PREVIEWABLE = ['solid', 'dashed', 'dotted'] as const;
const isPreviewable = (id: LineStyle): id is (typeof PREVIEWABLE)[number] =>
  (PREVIEWABLE as readonly string[]).includes(id);

// Segmented picker for a line style, each button previewing the dash pattern.
// Reusable wherever a solid/dashed/dotted choice is needed.
export default function LineStyleSelect({ value, onChange, options, label }: LineStyleSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-xs opacity-80">{label}</span>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            title={option.label}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className="h-8 w-full flex flex-col items-center justify-center gap-2"
            appearance={value === option.id ? 'primary' : 'secondary'}
          >
            {/* Line preview for CSS styles, label text for custom/others. */}
            {isPreviewable(option.id) ? (
              <svg aria-hidden="true" className="h-2 w-8" viewBox="0 0 32 8">
                {option.id === 'dotted' ? (
                  [3, 9.5, 16, 22.5, 29].map((cx) => (
                    <circle key={cx} cx={cx} cy="4" r="1.25" fill="currentColor" />
                  ))
                ) : (
                  <line
                    x1="0"
                    y1="4"
                    x2="32"
                    y2="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray={option.id === 'dashed' ? '4 3' : undefined}
                  />
                )}
              </svg>
            ) : (
              <span className="truncate px-1 text-xs">{option.label}</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
