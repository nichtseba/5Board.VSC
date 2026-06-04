import { useEffect, useState } from 'react';
import { init } from '../app/init';
import { EditorToolDefinition, EditorToolId, TOOL_DEFINITIONS } from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { useMessageService } from '../services/MessageService';

export default function ToolSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();

  const [selectedTool, setSelectedTool] = useState<EditorToolId>(EditorToolId.POINTER);
  const tools = Object.entries(TOOL_DEFINITIONS) as [EditorToolId, EditorToolDefinition][];

  useEffect(() => {
    messages.send({ type: 'selectTool', id: EditorToolId.POINTER });
  }, [messages]);

  const handleToolClick = (toolId: EditorToolId) => {
    setSelectedTool((prev) => {
      if (prev === toolId) return prev;

      messages.send({
        type: 'selectTool',
        id: toolId,
      });

      return toolId;
    });
  };

  return (
    <>
      <SidebarShell>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
          {tools.map(([key, tool]) => (
            <Button
              key={key}
              title={t(tool.labelKey)}
              appearance={selectedTool === key ? 'primary' : 'secondary'}
              className="h-8 flex flex-col items-center justify-center gap-2"
              onClick={() => handleToolClick(key)}
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
