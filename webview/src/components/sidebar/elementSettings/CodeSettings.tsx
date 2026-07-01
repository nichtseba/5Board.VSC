import { EditorElement, EditorElementType, isDefaultClassName } from '5board.vsc-common';
import { Dropdown, DropdownOption, TextField } from 'vscrui';
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

export function CodeSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const { className } = element.data;
  const hasMainWrap = isDefaultClassName(className, element.id);

  const handleClassNameChange = (value: string) => {
    messages.send({
      type: 'updateCodeBlockClass',
      elementId: element.id,
      className: value,
    });
  };

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
          <TextField value={className} placeholder={className} onChange={handleClassNameChange} />
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
              fontSize: '12px',
              opacity: 0.8,
            }}
          >
            <span className={`codicon codicon-${hasMainWrap ? 'symbol-method' : 'symbol-class'}`} />
            {hasMainWrap
              ? t('webview.sidebar-element-settings.codeSettings.mainWrapInfo')
              : t('webview.sidebar-element-settings.codeSettings.noMainWrapInfo')}
          </span>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
