type Props = {
  title: string;
  icon: string;
  children: React.ReactNode;
};

export default function SettingsPanel({ title, icon, children }: Props) {
  return (
    <section className="settings-panel">
      <h2 className="settings-panel-title">
        <span className={`codicon codicon-${icon}`} />
        {title}
      </h2>

      <div className="settings-panel-content">{children}</div>
    </section>
  );
}
