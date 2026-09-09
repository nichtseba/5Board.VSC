import { Label } from 'vscrui';

type Props = {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
};

export default function SettingsField({ label, children, inline = false }: Props) {
  if (inline) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3">
        <Label>{label}</Label>

        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      <Label>{label}</Label>

      {children}
    </div>
  );
}
