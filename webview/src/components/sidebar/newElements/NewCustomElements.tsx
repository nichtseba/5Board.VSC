import { ELEMENT_TYPE_DEFINITIONS, EditorTool } from '5board.vsc-common';
import { Button } from 'vscrui';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useEditorState } from '../../../providers/EditorStateProvider';
import { useMessageService } from '../../../services/MessageService';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewCustomElements(_: newElementProps) {
  const { t } = useLocalization();
  const editorState = useEditorState();
  const messages = useMessageService();
  const presets = editorState.presets ?? [];

  return (
    <SidebarSection title={t('webview.sidebar.presets.presets')}>
      {presets.length > 0 ? (
        <ul className="space-y-1">
          {presets.map((preset) => {
            const definition = ELEMENT_TYPE_DEFINITIONS[preset.element.type];
            const elementType = t(definition.label);

            return (
              <li
                key={preset.id}
                className="flex min-w-0 items-center gap-2 rounded-sm px-1 py-1 hover:bg-[var(--vscode-list-hoverBackground)]"
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
                    {elementType}
                    {preset.settings.keepContent
                      ? ` (${t('webview.sidebar.presets.hasContent')})`
                      : ''}
                  </p>
                </div>
                <Button
                  title={t('webview.sidebar.presets.deletePreset')}
                  aria-label={`${t('webview.sidebar.presets.deletePreset')}: ${preset.name}`}
                  appearance="secondary"
                  className="h-7 w-7 shrink-0"
                  onClick={() => messages.send({ type: 'deletePreset', id: preset.id })}
                >
                  <span className="codicon codicon-trash" aria-hidden="true" />
                </Button>
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
