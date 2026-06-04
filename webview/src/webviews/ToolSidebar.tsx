import { useState } from 'react';
import { init } from '../app/init';
import { ToolItem } from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { useMessageService } from '../services/MessageService';

export default function ToolSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleToolClick = (tool: ToolItem) => {
    setSelectedTool((prev) => {
      const next = prev === tool.id ? null : tool.id;
      messages.send({ type: 'selectTool', id: next });
      return next;
    });
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
    {
      id: 'spacer',
      label: t('webview.sidebar.tools.spacer'),
      icon: 'move',
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

init(ToolSidebar);
