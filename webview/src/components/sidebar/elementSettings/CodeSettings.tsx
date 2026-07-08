import {
  EditorElement,
  EditorElementType,
  SUPPORTED_LANGUAGES,
  getLanguageSupport,
  isDefaultClassName,
} from '5board.vsc-common';
import { Dropdown, DropdownOption } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';

type Props = {
  element: EditorElement<EditorElementType.Code>;
};

const NONE = '';

function optionValue(value: string | DropdownOption | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.value;
}

export function CodeSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const document = useBoardDocument();
  const { className, language } = element.data;
  const standalone = isDefaultClassName(className, element.id);

  const classes = (document?.content.codeClasses ?? []).filter((c) => c.language === language);
  const classOptions: DropdownOption[] = [
    { value: NONE, label: t('webview.sidebar-element-settings.codeSettings.classNone') },
    ...classes.map((c) => ({ value: c.name, label: c.name })),
  ];
  // Keep showing a class that an old document assigned but that never made it into the registry.
  if (!standalone && !classes.some((c) => c.name === className)) {
    classOptions.push({ value: className, label: className });
  }

  const languageOptions: DropdownOption[] = SUPPORTED_LANGUAGES.map((support) => ({
    value: support.id,
    label: support.displayName,
  }));
  if (!getLanguageSupport(language)) {
    languageOptions.push({ value: language, label: language, disabled: true });
  }

  const selectClass = (value: string | DropdownOption | undefined) => {
    const selected = optionValue(value);
    if (selected === undefined || selected === (standalone ? NONE : className)) return;
    messages.send({
      type: 'moveBlock',
      elementId: element.id,
      className: selected === NONE ? null : selected,
    });
  };

  const selectLanguage = (value: string | DropdownOption | undefined) => {
    const selected = optionValue(value);
    if (!selected || selected === language || !getLanguageSupport(selected)) return;
    messages.send({ type: 'moveBlock', elementId: element.id, language: selected });
  };

  return (
    <SettingsPanel title={t('webview.sidebar-element-settings.codeSettings.title')} icon="code">
      <SettingsField label={t('webview.sidebar-element-settings.codeSettings.languageLabel')}>
        <Dropdown
          options={languageOptions}
          value={language}
          disabled={!standalone}
          onChange={selectLanguage}
        />
        {!standalone && (
          <InfoLine icon="info">
            {t('webview.sidebar-element-settings.codeSettings.languageFromClass')}
          </InfoLine>
        )}
      </SettingsField>
      <SettingsField label={t('webview.sidebar-element-settings.codeSettings.classNameLabel')}>
        <Dropdown
          options={classOptions}
          value={standalone ? NONE : className}
          onChange={selectClass}
        />
        <InfoLine icon={standalone ? 'symbol-method' : 'symbol-class'}>
          {standalone
            ? t('webview.sidebar-element-settings.codeSettings.mainWrapInfo')
            : t('webview.sidebar-element-settings.codeSettings.noMainWrapInfo')}
        </InfoLine>
      </SettingsField>
    </SettingsPanel>
  );
}

function InfoLine({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="mt-1 flex items-center gap-1 text-xs opacity-80">
      <span className={`codicon codicon-${icon}`} />
      {children}
    </span>
  );
}
