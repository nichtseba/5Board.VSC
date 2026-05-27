import { Label } from 'vscrui';

type Props = {
  label: string;
  children: React.ReactNode;
};

export default function SettingsField({ label, children }: Props) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <Label>{label}</Label>

      {children}
    </div>
  );
}
