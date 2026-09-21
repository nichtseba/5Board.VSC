import {
  EditorElement,
  EditorElementType,
  getLanguageSupport,
  isDefaultClassName,
} from '5board.vsc-common';
import type { ElementStyle } from '5board.vsc-common';
import { Button, Dropdown, DropdownOption } from 'vscrui';
import { languageOptions as supportedLanguageOptions, optionValue } from '../codeblockOptions';
import ColorSelector from '../components/ColorSelector';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';

type Props = {
  element: EditorElement<EditorElementType.Code>;
};

const NONE = '';

export function CodeSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const document = useBoardDocument();
  const { className, language } = element.data;
  const standalone = isDefaultClassName(className, element.id);
  // Languages without a named-class model only ever hold standalone blocks.
  const hasClasses = getLanguageSupport(language)?.namedClasses !== undefined;

  const classes = (document?.content.codeClasses ?? []).filter((c) => c.language === language);
  const classOptions: DropdownOption[] = [
    { value: NONE, label: t('webview.sidebar-element-settings.codeSettings.classNone') },
    ...classes.map((c) => ({ value: c.name, label: c.name })),
  ];
  // Keep showing a class that an old document assigned but that never made it into the registry.
  if (!standalone && !classes.some((c) => c.name === className)) {
    classOptions.push({ value: className, label: className });
  }

  const languageOptions = supportedLanguageOptions();
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

  // updateElement merges shallowly, so always send the whole style object.
  const updateStyle = (patch: Partial<ElementStyle>) => {
    messages.send({
      type: 'updateElement',
      id: element.id,
      changes: { style: { ...element.style, ...patch } },
    });
  };
  const hasColorOverride =
    element.style.backgroundColor !== undefined || element.style.border?.color !== undefined;

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
      {hasClasses && (
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
      )}
      <SettingsField label={t('webview.sidebar-element-settings.codeSettings.backgroundLabel')}>
        <ColorSelector
          color={element.style.backgroundColor ?? ''}
          onChange={(color) => updateStyle({ backgroundColor: color })}
        />
      </SettingsField>
      <SettingsField label={t('webview.sidebar-element-settings.codeSettings.borderLabel')}>
        <ColorSelector
          color={element.style.border?.color ?? ''}
          onChange={(color) => updateStyle({ border: { ...element.style.border, color } })}
        />
      </SettingsField>
      {hasColorOverride && (
        <Button
          appearance="secondary"
          onClick={() =>
            updateStyle({
              backgroundColor: undefined,
              border: element.style.border && { ...element.style.border, color: undefined },
            })
          }
        >
          {t('webview.sidebar-element-settings.codeSettings.resetColors')}
        </Button>
      )}
      {element.data.lastOutput !== undefined && (
        <Button
          className="mt-2"
          appearance="secondary"
          onClick={() => messages.send({ type: 'codeblockResetOutput', elementId: element.id })}
        >
          {t('webview.sidebar-element-settings.codeSettings.resetOutput')}
        </Button>
      )}
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
