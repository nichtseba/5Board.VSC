import { Dropdown } from 'vscrui';

type Props = {
  value?: string;
  onChange?: (font: string) => void;
};

export function FontFamilyDropdown({ value, onChange }: Props) {
  return (
    <Dropdown
      options={fonts}
      value={value}
      onChange={(value) => {
        if (!value) {
          return;
        }

        onChange?.(typeof value === 'string' ? value : value.value);
      }}
    />
  );
}

const fonts = [
  {
    value: 'inter',
    label: 'Inter',
    family: 'Inter',
    hint: 'UI sans',
    category: 'sans-serif',
    default: true,
  },
  {
    value: 'georgia',
    label: 'Georgia',
    family: 'Georgia, serif',
    hint: 'Serif',
    category: 'serif',
  },
];
