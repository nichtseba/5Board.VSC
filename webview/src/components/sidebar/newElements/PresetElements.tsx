import {
  createAddElementToolFromPreset,
  createFreehandToolFromPreset,
  ELEMENT_TYPE_DEFINITIONS,
  EditorTool,
  EditorToolId,
  EditorElementType,
  AddElementToolParameters,
  Preset,
} from '5board.vsc-common';
import { Button } from 'vscrui';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useEditorState } from '../../../providers/EditorStateProvider';
import { useMessageService } from '../../../services/MessageService';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function PresetElements({ handleToolClick }: newElementProps) {
  const { t } = useLocalization();
  const editorState = useEditorState();
  const messages = useMessageService();
  const presets = editorState.presets ?? [];
  const presetsAreFiltered =
    editorState.tool.type === EditorToolId.AddElement ||
    editorState.tool.type === EditorToolId.FREEHAND;

  const selectedPresetId =
    editorState.tool.type === EditorToolId.AddElement
      ? (
          editorState.tool.parameters as AddElementToolParameters & {
            presetId?: string;
          }
        ).presetId
      : undefined;

  const filterPresets = (preset: Preset): boolean => {
    if (editorState.tool.type === EditorToolId.AddElement) {
      return (
        (editorState.tool.parameters as AddElementToolParameters)?.type === preset.element.type
      );
    } else if (editorState.tool.type === EditorToolId.FREEHAND) {
      return preset.element.type === EditorElementType.Freehand;
    }
    return true;
  };

  return (
    <SidebarSection
      title={t('webview.sidebar.presets.presets')}
      titleAddon={
        presetsAreFiltered ? (
          <span
            className="codicon codicon-filter ml-1 align-middle text-[var(--vscode-descriptionForeground)]"
            title={t('webview.sidebar.presets.filtered')}
            aria-label={t('webview.sidebar.presets.filtered')}
          />
        ) : null
      }
    >
      {presets.length > 0 ? (
        <ul className="space-y-1">
          {presets.filter(filterPresets).map((preset) => {
            const definition = ELEMENT_TYPE_DEFINITIONS[preset.element.type];
            const presetOptions = [
              preset.settings.keepStyle ? t('webview.sidebar.presets.settings.keepStyle') : null,
              preset.settings.keepXPosition
                ? t('webview.sidebar.presets.settings.keepXPosition')
                : null,
              preset.settings.keepContent ? t('webview.sidebar.presets.settings.content') : null,
            ].filter(Boolean);

            const optionsText = presetOptions.length > 0 ? ` (${presetOptions.join(', ')})` : '';

            return (
              <li
                key={preset.id}
                className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-sm px-1 py-1 hover:bg-[var(--vscode-list-hoverBackground)] ${
                  selectedPresetId === preset.id
                    ? 'bg-[var(--vscode-list-activeSelectionBackground)]'
                    : ''
                }`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (preset.element.type === EditorElementType.Image) {
                    messages.send({ type: 'loadPresetAsset', id: preset.id });
                    return;
                  }
                  handleToolClick(
                    createFreehandToolFromPreset(preset) ?? createAddElementToolFromPreset(preset),
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (preset.element.type === EditorElementType.Image) {
                      messages.send({ type: 'loadPresetAsset', id: preset.id });
                      return;
                    }
                    handleToolClick(
                      createFreehandToolFromPreset(preset) ??
                        createAddElementToolFromPreset(preset),
                    );
                  }
                }}
              >
                <span
                  className={`codicon codicon-${definition.icon} shrink-0 text-base text-[var(--vscode-foreground)]`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm" title={preset.name}>
                    {preset.name}
                  </p>
                  <p className="truncate text-xs text-[var(--vscode-descriptionForeground)]">
                    {optionsText}
                  </p>
                </div>
                <div onClick={(event) => event.stopPropagation()}>
                  <Button
                    title={t('webview.sidebar.presets.deletePreset')}
                    aria-label={`${t('webview.sidebar.presets.deletePreset')}: ${preset.name}`}
                    appearance="secondary"
                    className="flex h-7 w-7 shrink-0 items-center justify-center p-0"
                    onClick={() =>
                      messages.send({
                        type: 'deletePreset',
                        id: preset.id,
                      })
                    }
                  >
                    <span className="codicon codicon-trash" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-[var(--vscode-descriptionForeground)]">
          {t('webview.sidebar.presets.noPresets')}
        </p>
      )}
      <Button
        appearance="secondary"
        className="mt-3 w-full justify-center"
        onClick={() => messages.send({ type: 'revealPresetsFile' })}
      >
        <span className="codicon codicon-folder-opened mr-1" aria-hidden="true" />
        {t('webview.sidebar.presets.openPresetFile')}
      </Button>
    </SidebarSection>
  );
}
