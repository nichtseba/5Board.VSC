import { useEffect, useState } from 'react';
import { init } from '../app/init';
import {
  DEFAULT_FREEHAND_PARAMETERS,
  EditorTool,
  EditorToolDefinition,
  EditorToolId,
  FREEHAND_COLORS,
  FREEHAND_LINE_STYLES,
  FREEHAND_MAX_DASH,
  FREEHAND_MAX_WIDTH,
  FREEHAND_MIN_DASH,
  FREEHAND_MIN_WIDTH,
  FreehandToolParameters,
  TOOL_DEFINITIONS,
  TranslationKey,
} from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import SliderInput from '../components/sidebar/components/SliderInput';
import { ColorPicker } from '../components/sidebar/components/ColorPicker';
import LineStyleSelect from '../components/sidebar/components/LineStyleSelect';
import { useMessageService } from '../services/MessageService';

export default function ToolSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();

  const [selectedTool, setSelectedTool] = useState<EditorTool>({
    type: EditorToolId.POINTER,
    parameters: undefined,
  });
  // Freehand drawing options, sent with the tool via 'selectTool'.
  const [freehandParams, setFreehandParams] = useState<FreehandToolParameters>(
    DEFAULT_FREEHAND_PARAMETERS,
  );
  const tools = Object.entries(TOOL_DEFINITIONS) as [EditorToolId, EditorToolDefinition][];

  useEffect(() => {
    messages.send({ type: 'selectTool', tool: selectedTool });
    messages.send({ type: 'ready' }); // request current projector settings state
  }, [messages]);

  // Builds the tool payload, attaching freehand parameters for the freehand tool.
  const toolFor = (toolId: EditorToolId): EditorTool =>
    toolId === EditorToolId.FREEHAND
      ? { type: EditorToolId.FREEHAND, parameters: freehandParams }
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

  // Patch freehand params and, while the tool is active, re-send it live.
  const updateFreehand = (patch: Partial<FreehandToolParameters>) => {
    const parameters = { ...freehandParams, ...patch };
    setFreehandParams(parameters);
    if (selectedTool.type === EditorToolId.FREEHAND) {
      const tool: EditorTool = { type: EditorToolId.FREEHAND, parameters };
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
          <Button
            title="Image"
            appearance="secondary"
            className="h-8 flex flex-col items-center justify-center gap-2"
            onClick={() => messages.send({ type: 'addImageFromFile' })}
          >
            <span className="codicon codicon-file-media" />
          </Button>
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
                  onClick={() => updateFreehand({ color: color.value })}
                  className={`h-6 w-6 rounded-full border border-foreground-description ${
                    freehandParams.color === color.value
                      ? 'outline outline-2 outline-offset-1 outline-focus-border'
                      : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>

            {/* Custom colour beyond the presets */}
            <ColorPicker
              color={freehandParams.color}
              onChange={(color) => updateFreehand({ color })}
              label={t('webview.sidebar.freehand.customColor')}
            />

            <SliderInput
              label={t('webview.sidebar.freehand.width')}
              value={freehandParams.width}
              min={FREEHAND_MIN_WIDTH}
              max={FREEHAND_MAX_WIDTH}
              step={1}
              unit="px"
              onChange={(width) => updateFreehand({ width })}
            />

            {/* Opacity slider in percent (0–100%). Stored as opacity (0..1). */}
            <SliderInput
              label={t('webview.sidebar.freehand.opacity')}
              value={Math.round(freehandParams.opacity * 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={(value) => updateFreehand({ opacity: value / 100 })}
            />

            <LineStyleSelect
              label={t('webview.sidebar.freehand.lineStyle')}
              value={freehandParams.lineStyle}
              options={FREEHAND_LINE_STYLES.map((s) => ({
                id: s.id,
                label: t(`webview.sidebar.freehand.lineStyles.${s.id}` as TranslationKey),
              }))}
              onChange={(lineStyle) => updateFreehand({ lineStyle })}
            />

            {/* Dash size slider — only for the custom line style. */}
            {freehandParams.lineStyle === 'custom' && (
              <SliderInput
                label={t('webview.sidebar.freehand.dashScale')}
                value={freehandParams.dashScale}
                min={FREEHAND_MIN_DASH}
                max={FREEHAND_MAX_DASH}
                step={1}
                onChange={(dashScale) => updateFreehand({ dashScale })}
              />
            )}
          </section>
        )}
      </SidebarShell>
    </>
  );
}

init(ToolSidebar);
