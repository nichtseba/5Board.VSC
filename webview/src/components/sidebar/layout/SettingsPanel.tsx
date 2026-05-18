import { Icon } from 'vscrui';

type Props = {
  type: string;
  icon: string;
  children: React.ReactNode;
};

export default function SettingsPanel({ type, icon, children }: Props) {
  return (
    <section className="settings-panel">
      <h2 className="settings-panel-title">
        <span className={`codicon codicon-${icon}`} />
        {type}
      </h2>

      <div className="settings-panel-content">{children}</div>
    </section>
  );
}
