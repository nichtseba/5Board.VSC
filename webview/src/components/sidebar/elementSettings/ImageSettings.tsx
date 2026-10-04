import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Divider } from 'vscrui';
import { TransformationSettings } from './TransformationSettings';
import GenericElementSettings from './GenericElementSettings';

type Props = {
  elements: EditorElement<EditorElementType.Image>[];
};

export function ImageSettings({ elements }: Props) {
  const { t } = useLocalization();
  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.imageSettings.title')}
      icon="file-media"
    >
      <GenericElementSettings element={elements[0]} />
      <Divider />
      <TransformationSettings elements={elements} />
    </SettingsPanel>
  );
}
