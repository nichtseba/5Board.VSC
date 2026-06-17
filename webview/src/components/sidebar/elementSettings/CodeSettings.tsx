import { EditorElement, EditorElementType } from '5board.vsc-common';
import { Dropdown, DropdownOption } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';

type Props = {
  element: EditorElement<EditorElementType.Code>;
};

const LANGUAGE_OPTIONS = [
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
];

function resolveValue(v: string | DropdownOption | undefined): string {
  if (!v) return '';
  return typeof v === 'string' ? v : v.value;
}

export function CodeSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  function handleLanguageChange(v: string | DropdownOption | undefined) {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: { data: { ...element.data, language: resolveValue(v) } },
    });
  }

  function handleClassNameChange(v: string | DropdownOption | undefined) {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: { data: { ...element.data, className: resolveValue(v) } },
    });
  }

  return (
    <>
      <SettingsPanel title={t('webview.sidebar-element-settings.codeSettings.title')} icon="code">
        <SettingsField label={t('webview.sidebar-element-settings.codeSettings.languageLabel')}>
          <Dropdown
            options={LANGUAGE_OPTIONS}
            value={element.data.language ?? 'java'}
            onChange={handleLanguageChange}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.codeSettings.classNameLabel')}>
          <Dropdown
            options={[
              { value: element.data.className ?? '', label: element.data.className ?? '–' },
            ]}
            value={element.data.className ?? ''}
            onChange={handleClassNameChange}
          />
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
