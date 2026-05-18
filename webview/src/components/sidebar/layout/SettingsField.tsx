import { Label } from 'vscrui';

type Props = {
  label: string;
  children: React.ReactNode;
};

export default function SettingsField({ label, children }: Props) {
  return (
    <div className="settings-field">
      <Label>{label}</Label>

      {children}
    </div>
  );
}
