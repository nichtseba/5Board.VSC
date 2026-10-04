import { EditorElement, EditorElementType } from '5board.vsc-common';
import { Checkbox } from 'vscrui';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import { Divider } from 'vscrui';
import { TransformationSettings } from './TransformationSettings';
import GenericElementSettings from './GenericElementSettings';

type Props = {
  elements: EditorElement<EditorElementType.Image>[];
};

export function ImageSettings({ elements }: Props) {
  const { t } = useLocalization();
  const selectedElementTitles = elements.map((element) => element.data.title);

  const messages = useMessageService();

  const hideInExport = elements.every((element) => element.data.hideInExport === true);

  const updateHideInExport = (checked: boolean) => {
    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          data: {
            ...element.data,
            hideInExport: checked,
          },
        },
      })),
    });
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.imageSettings.title')}
      icon="file-media"
    >
      <GenericElementSettings element={elements[0]} />
      <Divider />
      <TransformationSettings elements={elements} />
      <Divider />
      <div>
        {t('webview.sidebar-element-settings.imageSettings.imageName')}: &nbsp;
        {selectedElementTitles.join(', ')}
      </div>
      <br></br>
      <Checkbox checked={hideInExport} onChange={updateHideInExport}>
        {t('webview.sidebar-element-settings.imageSettings.hideInExport')}
      </Checkbox>
    </SettingsPanel>
  );
}
