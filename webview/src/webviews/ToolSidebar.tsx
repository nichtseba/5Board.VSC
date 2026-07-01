import { useEffect } from 'react';
import { init } from '../app/init';
import {
  EditorTool,
  EditorToolDefinition,
  EditorToolId,
  TOOL_DEFINITIONS,
} from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import { useMessageService } from '../services/MessageService';
import { useEditorState } from '../providers/EditorStateProvider';
import { NewElements } from '../components/sidebar/newElements/NewElements';
import { NewCustomElements } from '../components/sidebar/newElements/NewCustomElements';

export default function ToolSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();
  const editorState = useEditorState();

  const selectedTool = editorState?.tool;
  const tools = Object.entries(TOOL_DEFINITIONS) as [EditorToolId, EditorToolDefinition][];

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  const handleToolClick = (tool: EditorTool) => {
    if (tool.type === selectedTool?.type) return;

    messages.send({ type: 'selectTool', tool });
  };

  return (
    <>
      <SidebarShell>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
          {tools
            .filter(([key]) => key !== EditorToolId.AddElement)
            .map(([key, tool]) => (
              <Button
                key={key}
                title={t(tool.labelKey)}
                appearance={selectedTool?.type === key ? 'primary' : 'secondary'}
                className="h-8 flex flex-col items-center justify-center gap-2"
                onClick={() => handleToolClick({ type: key, parameters: null })}
              >
                <span className={`codicon codicon-${tool.icon}`} />
              </Button>
            ))}
        </div>
        <NewElements handleToolClick={handleToolClick} />
        <NewCustomElements handleToolClick={handleToolClick} />
      </SidebarShell>
    </>
  );
}

init(ToolSidebar);
