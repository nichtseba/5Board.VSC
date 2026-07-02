import { EditorElement, EditorElementType } from '5board.vsc-common';
import { Dropdown, DropdownOption } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';

type Props = {
  element: EditorElement<EditorElementType.Heading>;
};
export function HeadingSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const handleLevelChange = (value: string | DropdownOption | undefined) => {
    if (!value) {
      return;
    }
    const newLevel = typeof value === 'string' ? value : value.value;
    const level = parseInt(newLevel, 10) as 1 | 2 | 3 | 4 | 5 | 6;

    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: {
        data: {
          ...element.data,
          level,
        },
      },
    });
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.headingSettings.title')}
      icon="text-size"
    >
      <SettingsField label={t('webview.sidebar-element-settings.headingSettings.levelLabel')}>
        <Dropdown
          options={[
            { value: '1', label: 'H1' },
            { value: '2', label: 'H2' },
            { value: '3', label: 'H3' },
            { value: '4', label: 'H4' },
            { value: '5', label: 'H5' },
            { value: '6', label: 'H6' },
          ]}
          value={String(element.data.level)}
          onChange={handleLevelChange}
        />
      </SettingsField>
    </SettingsPanel>
  );
}
