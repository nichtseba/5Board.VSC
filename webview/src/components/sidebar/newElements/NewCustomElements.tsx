import { EditorTool } from '5board.vsc-common';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useEditorState } from '../../../providers/EditorStateProvider';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewCustomElements(_: newElementProps) {
  const { t } = useLocalization();
  const editorState = useEditorState();
  const presets = editorState.presets ?? [];
  return (
    <>
      <SidebarSection title={t('webview.sidebar.addCustomElement')}>
        {presets.length > 0 ? (
          <ul className="space-y-1">
            {presets.map((preset) => (
              <li key={preset.id} className="text-sm">
                {preset.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No presets</p>
        )}
      </SidebarSection>
    </>
  );
}
