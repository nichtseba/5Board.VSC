import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import SettingsField from '../layout/SettingsField';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import { getCommonValue } from './utils/getCommonValue';
import { Divider } from 'vscrui';
import { TransformationSettings } from './TransformationSettings';
import GenericElementSettings from './GenericElementSettings';
import { FontSizeInput } from './components/FontSizeInput';

type Props = {
  elements: EditorElement<EditorElementType.TableOfContents>[];
};

export function TableOfContentsSettings({ elements }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const handleFontSizeChange = (value: string) => {
    const fontSize = Number(value);
    if (!Number.isFinite(fontSize) || fontSize <= 0) return;

    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          data: { ...element.data, fontSize },
        },
      })),
    });
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.tableOfContentsSettings.title')}
      icon="list-unordered"
    >
      <GenericElementSettings element={elements[0]} />
      <Divider />
      <TransformationSettings elements={elements} />
      <Divider />
      <SettingsField label={t('webview.sidebar-element-settings.textSettings.fontSettings')}>
        <FontSizeInput
          value={getCommonValue(elements.map((element) => element.data.fontSize)) ?? 14}
          onChange={handleFontSizeChange}
        />
      </SettingsField>
    </SettingsPanel>
  );
}
