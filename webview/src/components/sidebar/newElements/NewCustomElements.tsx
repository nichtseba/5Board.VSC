import { EditorTool } from '5board.vsc-common';
import SidebarSection from '../layout/SidebarSection';
import { useLocalization } from '../../../providers/LocalizationProvider';

export type newElementProps = {
  handleToolClick: (tool: EditorTool) => void;
};

export function NewCustomElements({ handleToolClick }: newElementProps) {
  const { t } = useLocalization();
  return (
    <>
      <SidebarSection title={t('webview.sidebar.addCustomElement')}>
        {/* Todo: replace this with actual valid content. This is just a placeholder */}
        {false && <div onClick={() => handleToolClick}></div>}
      </SidebarSection>
    </>
  );
}
