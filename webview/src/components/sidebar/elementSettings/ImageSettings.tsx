import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { Checkbox } from 'vscrui';
import { useMessageService } from '../../../services/MessageService';
import { useLocalization } from '../../../providers/LocalizationProvider';

type Props = {
  element: EditorElement<EditorElementType.Image>;
};

export function ImageSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const handleKeepAspectRatioChange = (keepAspectRatio: boolean) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: {
        data: {
          ...element.data,
          keepAspectRatio,
        },
      },
    });
  };

  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.imageSettings.title')}
        icon="file-media"
      >
        <Checkbox
          checked={element.data.keepAspectRatio ?? true}
          onChange={handleKeepAspectRatioChange}
        >
          {t('webview.sidebar-element-settings.imageSettings.keepAspectRatio')}
        </Checkbox>
      </SettingsPanel>
    </>
  );
}
