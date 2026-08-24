import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';

type Props = {
  element: EditorElement<EditorElementType.ContentTable>;
};

export function ContentTableSettings({}: Props) {
  const { t } = useLocalization();

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.contentTableSettings.title')}
      icon="list-unordered"
    >
      <></>
    </SettingsPanel>
  );
}
