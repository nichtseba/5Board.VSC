import { useState } from 'react';
import { init } from '../app/init';
import { ToolItem } from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

export default function Sidebar() {
  const { t } = useLocalization();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleToolClick = (tool: ToolItem) => {
    setSelectedTool((prev) => (prev === tool.id ? null : tool.id));
  };
  const tools: ToolItem[] = [
    {
      id: 'pointer',
      label: t('webview.sidebar.tools.pointer'),
      icon: 'cursor',
    },
    {
      id: 'text',
      label: t('webview.sidebar.tools.text'),
      icon: 'symbol-string',
    },
    {
      id: 'heading',
      label: t('webview.sidebar.tools.heading'),
      icon: 'text-size',
    },
    {
      id: 'link',
      label: t('webview.sidebar.tools.link'),
      icon: 'link',
    },
    {
      id: 'code',
      label: t('webview.sidebar.tools.code'),
      icon: 'code',
    },
    {
      id: 'image',
      label: t('webview.sidebar.tools.image'),
      icon: 'file-media',
    },
  ];

  return (
    <>
      <SidebarShell>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              title={tool.label}
              appearance={selectedTool === tool.id ? 'primary' : 'secondary'}
              className="h-8 flex flex-col items-center justify-center gap-2"
              onClick={() => handleToolClick(tool)}
            >
              <span className={`codicon codicon-${tool.icon}`} />
            </Button>
          ))}
        </div>
      </SidebarShell>
    </>
  );
}

init(Sidebar);
