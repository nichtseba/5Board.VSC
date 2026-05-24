import { EditorElement, EditorElementType } from '5board.vsc-common';
import { Dropdown } from 'vscrui';
import SettingsField from './layout/SettingsField';
import SettingsPanel from './layout/SettingsPanel';
import { useLocalization } from '../../providers/LocalizationProvider';

type Props = {
  element: EditorElement<EditorElementType.Heading>;
};
function HeadingSettings({ element }: Props) {
  const { t } = useLocalization();
  return (
    <>
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
            value={String(element?.data.level)}
          />
        </SettingsField>
      </SettingsPanel>
    </>
  );
}

export default HeadingSettings;
