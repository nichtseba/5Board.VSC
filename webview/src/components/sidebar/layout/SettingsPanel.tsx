type Props = {
  title: string;
  icon: string;
  children: React.ReactNode;
};

export default function SettingsPanel({ title, icon, children }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex align-center justify-center gap-2 font-semibold uppercase text-[var(--vscode-descriptionForeground)]">
        <span className={`codicon codicon-${icon}`} />
        {title}
      </h2>

      <div className="settings-panel-content">{children}</div>
    </section>
  );
}
