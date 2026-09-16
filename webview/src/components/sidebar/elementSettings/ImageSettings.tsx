import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';

type Props = {
  element: EditorElement<EditorElementType.Image>;
};

export function ImageSettings({ element }: Props) {
  const { t } = useLocalization();

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.imageSettings.title')}
      icon="file-media"
    >
      <>
        <div>{element.data.title}</div>
      </>
    </SettingsPanel>
  );
}
