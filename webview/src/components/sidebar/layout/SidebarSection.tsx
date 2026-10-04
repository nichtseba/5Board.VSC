type Props = {
  title: string;
  icon?: string;
  titleAddon?: React.ReactNode;
  children: React.ReactNode;
};

export default function SidebarSection({ title, icon, titleAddon, children }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="mt-1 mb-2 flex items-center text-xs font-medium uppercase tracking-wide text-descriptionForeground">
        <span>
          {icon && <span className={`codicon codicon-${icon}`} />}
          {title}
        </span>
        {titleAddon && <span className="ml-auto">{titleAddon}</span>}
      </h2>

      <div className="settings-panel-content">{children}</div>
    </section>
  );
}
