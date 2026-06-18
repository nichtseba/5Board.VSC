import { EditorElement, EditorElementType } from '5board.vsc-common';
import { Dropdown, DropdownOption } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';

type Props = {
  element: EditorElement<EditorElementType.Code>;
};

const LANGUAGE_OPTIONS = [
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
];

export function CodeSettings({ element }: Props) {
  const { t } = useLocalization();
  const className = element.data.className;

  return (
    <>
      <SettingsPanel title={t('webview.sidebar-element-settings.codeSettings.title')} icon="code">
        <SettingsField label={t('webview.sidebar-element-settings.codeSettings.languageLabel')}>
          <Dropdown
            options={LANGUAGE_OPTIONS}
            value={element.data.language}
            onChange={(_v: string | DropdownOption | undefined) => {
              // TODO: language is determined by the source file — editing not yet supported
            }}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.codeSettings.classNameLabel')}>
          <span>{className || '–'}</span>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
