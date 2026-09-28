import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';

type Props = {
  elements: EditorElement<EditorElementType.Image>[];
};

export function ImageSettings({ elements }: Props) {
  const { t } = useLocalization();
  const selectedElementIds = elements.map((element) => element.id);
  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.imageSettings.title')}
      icon="file-media"
    >
      <>
        <div>Add ImageSettings for{selectedElementIds.join(', ')}</div>
      </>
    </SettingsPanel>
  );
}
