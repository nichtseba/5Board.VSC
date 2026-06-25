import { useEffect, useState } from 'react';
import { init } from '../app/init';
import {
  EditorTool,
  EditorToolDefinition,
  EditorToolId,
  TOOL_DEFINITIONS,
} from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { Button, Checkbox } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import SettingsPanel from '../components/sidebar/layout/SettingsPanel';
import { useMessageService, useOnMessage } from '../services/MessageService';

export default function ToolSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();

  const [selectedTool, setSelectedTool] = useState<EditorTool>({
    type: EditorToolId.POINTER,
    parameters: undefined,
  });
  // Cursor tracking is a global projector setting, synced from the extension.
  const [cursorTracking, setCursorTracking] = useState(true);
  const tools = Object.entries(TOOL_DEFINITIONS) as [EditorToolId, EditorToolDefinition][];

  useEffect(() => {
    messages.send({ type: 'selectTool', tool: selectedTool });
    messages.send({ type: 'ready' }); // request current cursor tracking state
  }, [messages]);

  // Reflect the current state whenever the extension broadcasts a change.
  useOnMessage((msg) => {
    if (msg.type === 'cursorTrackingChanged') {
      setCursorTracking(msg.enabled);
    }
  });

  // The extension owns the state and echoes it back via 'cursorTrackingChanged'.
  const handleToggleCursorTracking = () => {
    messages.send({ type: 'toggleCursorTracking' });
  };

  const handleToolClick = (toolId: EditorToolId) => {
    setSelectedTool((prev) => {
      if (prev.type === toolId) return prev;
      messages.send({
        type: 'selectTool',
        tool: { type: toolId, parameters: undefined },
      });
      return { type: toolId, parameters: undefined };
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
              appearance={selectedTool.type === key ? 'primary' : 'secondary'}
              className="h-8 flex flex-col items-center justify-center gap-2"
              onClick={() => handleToolClick(key)}
            >
              <span className={`codicon codicon-${tool.icon}`} />
            </Button>
          ))}
        </div>

        {/* Projector settings as a separate panel below the tools */}
        <div className="mt-6">
          <SettingsPanel
            title={t('webview.sidebar.projectorSettings.title')}
            icon="device-camera-video"
          >
            <Checkbox checked={cursorTracking} onChange={() => handleToggleCursorTracking()}>
              {t('webview.sidebar.projectorSettings.cursorTracking')}
            </Checkbox>
          </SettingsPanel>
        </div>
      </SidebarShell>
    </>
  );
}

init(ToolSidebar);
