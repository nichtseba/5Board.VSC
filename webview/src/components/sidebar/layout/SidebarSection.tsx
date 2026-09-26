type Props = {
  title: string;
  icon?: string;
  children: React.ReactNode;
};

export default function SidebarSection({ title, icon, children }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="mt-1 mb-2 text-xs font-medium uppercase tracking-wide text-descriptionForeground">
        {icon && <span className={`codicon codicon-${icon}`} />}
        {title}
      </h2>

      <div className="settings-panel-content">{children}</div>
    </section>
  );
}
