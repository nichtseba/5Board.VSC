import { EditorTool } from '5board.vsc-common';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewCustomElements(_: newElementProps) {
  const { t } = useLocalization();

  return (
    <>
      <SidebarSection title={t('webview.sidebar.addCustomElement')}>
        <p className="text-sm text-slate-400">Coming soon</p>
      </SidebarSection>
    </>
  );
}
