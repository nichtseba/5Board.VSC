import { Dropdown } from 'vscrui';

type Props = {
  value?: string;
  onChange?: (font: string) => void;
  label?: string;
};

export function FontFamilyDropdown({ value, onChange, label }: Props) {
  return (
    <>
      {label && <span className="text-foreground-description">{label}</span>}
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
    </>
  );
}

const fonts = [
  {
    value: 'default',
    label: 'Default',
    default: true,
  },
  {
    value: 'arial',
    label: 'Arial',
  },
  {
    value: 'courier new',
    label: 'Courier New',
  },
  {
    value: 'georgia',
    label: 'Georgia',
  },
  {
    value: 'helvetica',
    label: 'Helvetica',
  },
  {
    value: 'inter',
    label: 'Inter',
  },
  {
    value: 'monospace',
    label: 'Monospace',
  },
  {
    value: 'times new roman',
    label: 'Times New Roman',
  },
  {
    value: 'verdana',
    label: 'Verdana',
  },
];
