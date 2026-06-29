import { useEffect, useState } from 'react';
import { init } from '../app/init';
import {
  DEFAULT_FREEHAND_PARAMETERS,
  EditorTool,
  EditorToolDefinition,
  EditorToolId,
  FREEHAND_COLORS,
  FREEHAND_WIDTHS,
  TOOL_DEFINITIONS,
  TranslationKey,
} from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import ProjectorSettings from '../components/projector/ProjectorSettings';
import { useMessageService } from '../services/MessageService';

export default function ToolSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();

  const [selectedTool, setSelectedTool] = useState<EditorTool>({
    type: EditorToolId.POINTER,
    parameters: undefined,
  });
  // Freehand drawing options, sent with the tool via 'selectTool'.
  const [freehandColor, setFreehandColor] = useState(DEFAULT_FREEHAND_PARAMETERS.color);
  const [freehandWidth, setFreehandWidth] = useState(DEFAULT_FREEHAND_PARAMETERS.width);
  const tools = Object.entries(TOOL_DEFINITIONS) as [EditorToolId, EditorToolDefinition][];

  useEffect(() => {
    messages.send({ type: 'selectTool', tool: selectedTool });
    messages.send({ type: 'ready' }); // request current projector settings state
  }, [messages]);

  // Builds the tool payload, attaching freehand parameters for the freehand tool.
  const toolFor = (toolId: EditorToolId): EditorTool =>
    toolId === EditorToolId.FREEHAND
      ? { type: EditorToolId.FREEHAND, parameters: { color: freehandColor, width: freehandWidth } }
      : { type: toolId, parameters: undefined };

  const selectTool = (toolId: EditorToolId) => {
    const tool = toolFor(toolId);
    setSelectedTool(tool);
    messages.send({ type: 'selectTool', tool });
  };

  const handleToolClick = (toolId: EditorToolId) => {
    if (selectedTool.type === toolId) return;
    selectTool(toolId);
  };

  // Re-send the freehand tool with updated parameters while it is active.
  const handleFreehandColor = (color: string) => {
    setFreehandColor(color);
    if (selectedTool.type === EditorToolId.FREEHAND) {
      const tool: EditorTool = {
        type: EditorToolId.FREEHAND,
        parameters: { color, width: freehandWidth },
      };
      setSelectedTool(tool);
      messages.send({ type: 'selectTool', tool });
    }
  };

  const handleFreehandWidth = (width: number) => {
    setFreehandWidth(width);
    if (selectedTool.type === EditorToolId.FREEHAND) {
      const tool: EditorTool = {
        type: EditorToolId.FREEHAND,
        parameters: { color: freehandColor, width },
      };
      setSelectedTool(tool);
      messages.send({ type: 'selectTool', tool });
    }
  };

  const freehandSelected = selectedTool.type === EditorToolId.FREEHAND;

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

        {/* Freehand options — only shown while the freehand tool is active */}
        {freehandSelected && (
          <section className="mt-6 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {t('webview.sidebar.freehand.title')}
            </span>

            <span className="text-xs opacity-80">{t('webview.sidebar.freehand.color')}</span>
            <div className="flex flex-wrap gap-2">
              {FREEHAND_COLORS.map((color) => (
                <button
                  key={color.id}
                  title={t(`webview.sidebar.freehand.colors.${color.id}` as TranslationKey)}
                  onClick={() => handleFreehandColor(color.value)}
                  className={`h-6 w-6 rounded-full border border-foreground-description ${
                    freehandColor === color.value
                      ? 'outline outline-2 outline-offset-1 outline-focus-border'
                      : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>

            <span className="text-xs opacity-80">{t('webview.sidebar.freehand.width')}</span>
            <div className="flex flex-wrap gap-2">
              {FREEHAND_WIDTHS.map((width) => (
                <Button
                  key={width.id}
                  appearance={freehandWidth === width.value ? 'primary' : 'secondary'}
                  onClick={() => handleFreehandWidth(width.value)}
                >
                  {t(`webview.sidebar.freehand.widths.${width.id}` as TranslationKey)}
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* Projector settings as a separate panel below the tools */}
        <div className="mt-6">
          <ProjectorSettings />
        </div>
      </SidebarShell>
    </>
  );
}

init(ToolSidebar);
