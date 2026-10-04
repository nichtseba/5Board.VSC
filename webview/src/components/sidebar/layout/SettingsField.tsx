import { Label } from 'vscrui';

type Props = {
  label?: string;
  children: React.ReactNode;
  inline?: boolean;
};

export default function SettingsField({ label, children, inline = false }: Props) {
  if (inline) {
    return (
      <div className="mb-4 flex items-center gap-1">
        <Label className="w-4 shrink-0 whitespace-nowrap text-right">{label}</Label>

        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {label && <Label>{label}</Label>}

      {children}
    </div>
  );
}
