import { useEffect, useState } from 'react';
import { init } from '../app/init';
import {
  DEFAULT_FREEHAND_PARAMETERS,
  EditorToolId,
  FREEHAND_COLORS,
  FREEHAND_WIDTHS,
  ToolItem,
  TranslationKey,
} from '5board.vsc-common';
import { useLocalization } from '../providers/LocalizationProvider';
import { useMessageService } from '../services/MessageService';
import { Button } from 'vscrui';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

export default function ToolSidebar() {
  const { t } = useLocalization();
  const messages = useMessageService();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  // Freehand drawing options, mirrored to the editor via 'setTool'.
  const [freehandColor, setFreehandColor] = useState(DEFAULT_FREEHAND_PARAMETERS.color);
  const [freehandWidth, setFreehandWidth] = useState(DEFAULT_FREEHAND_PARAMETERS.width);

  // Ask the extension for the current language so the sidebar is localized.
  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  // Sends the freehand tool together with its current color/width to the editor.
  const sendFreehandTool = (color: string, width: number) => {
    messages.send({
      type: 'setTool',
      tool: { type: EditorToolId.FREEHAND, parameters: { color, width } },
    });
  };

  const handleToolClick = (tool: ToolItem) => {
    const next = selectedTool === tool.id ? null : tool.id;
    setSelectedTool(next);

    // Freehand tool wiring (this is the only tool handled here for now):
    // activating it starts drawing, leaving it switches the editor back to the pointer.
    if (next === EditorToolId.FREEHAND) {
      sendFreehandTool(freehandColor, freehandWidth);
    } else if (selectedTool === EditorToolId.FREEHAND) {
      messages.send({
        type: 'setTool',
        tool: { type: EditorToolId.POINTER, parameters: undefined },
      });
    }
  };

  const handleColorChange = (color: string) => {
    setFreehandColor(color);
    if (selectedTool === EditorToolId.FREEHAND) sendFreehandTool(color, freehandWidth);
  };

  const handleWidthChange = (width: number) => {
    setFreehandWidth(width);
    if (selectedTool === EditorToolId.FREEHAND) sendFreehandTool(freehandColor, width);
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
      id: 'freehand',
      label: t('webview.sidebar.tools.freehand'),
      icon: 'pencil',
    },
  ];

  const freehandSelected = selectedTool === EditorToolId.FREEHAND;

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

        {/* Freehand options — only shown while the freehand tool is active */}
        {freehandSelected && (
          <section className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {t('webview.sidebar.freehand.title')}
            </span>

            <span className="text-xs opacity-80">{t('webview.sidebar.freehand.color')}</span>
            <div className="flex flex-wrap gap-2">
              {FREEHAND_COLORS.map((color) => (
                <button
                  key={color.id}
                  title={t(`webview.sidebar.freehand.colors.${color.id}` as TranslationKey)}
                  onClick={() => handleColorChange(color.value)}
                  className={`h-6 w-6 rounded-full border border-[var(--vscode-widget-border)] ${
                    freehandColor === color.value
                      ? 'outline outline-2 outline-offset-1 outline-[var(--vscode-focusBorder)]'
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
                  onClick={() => handleWidthChange(width.value)}
                >
                  {t(`webview.sidebar.freehand.widths.${width.id}` as TranslationKey)}
                </Button>
              ))}
            </div>
          </section>
        )}
      </SidebarShell>
    </>
  );
}

init(ToolSidebar);
