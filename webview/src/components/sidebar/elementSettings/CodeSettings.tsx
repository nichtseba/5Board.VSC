import {
  EditorElement,
  EditorElementType,
  getLanguageSupport,
  isDefaultClassName,
} from '5board.vsc-common';
import type { ElementStyle } from '5board.vsc-common';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { Button, Divider, Dropdown, DropdownOption } from 'vscrui';
import { languageOptions as supportedLanguageOptions, optionValue } from '../codeblockOptions';
import ColorSelector from '../components/CompactColorSelector';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import GenericElementSettings from './GenericElementSettings';
import { TransformationSettings } from './TransformationSettings';

type Props = {
  elements: EditorElement<EditorElementType.Code>[];
};

const NONE = '';

export function CodeSettings({ elements }: Props) {
  // Class, language and output are per block, so settings only apply to a single selection.
  if (elements.length !== 1) return null;

  const { t } = useLocalization();
  return (
    <>
      <SettingsPanel title={t('webview.sidebar-element-settings.codeSettings.title')} icon="code">
        <GenericElementSettings element={elements[0]} />
        <Divider />
        <TransformationSettings elements={elements} />
        <Divider />
        <SingleCodeSettings element={elements[0]} />
      </SettingsPanel>
    </>
  );
}

function SingleCodeSettings({ element }: { element: EditorElement<EditorElementType.Code> }) {
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

  // updateElements merges shallowly, so always send the whole style object.
  const updateStyle = (patch: Partial<ElementStyle>) => {
    messages.send({
      type: 'updateElements',
      changes: [{ id: element.id, changes: { style: { ...element.style, ...patch } } }],
    });
  };
  const hasColorOverride =
    element.style.backgroundColor !== undefined || element.style.border?.color !== undefined;

  return (
    <>
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
        <>
          <Divider />
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
        </>
      )}
      <Divider />
      <SettingsField label={t('webview.sidebar-element-settings.codeSettings.style')}>
        <ColorSelector
          color={element.style.backgroundColor}
          onChange={(color) => updateStyle({ backgroundColor: color })}
          label={t('webview.sidebar-element-settings.codeSettings.backgroundLabel')}
        />

        <ColorSelector
          color={element.style.border?.color}
          onChange={(color) => updateStyle({ border: { ...element.style.border, color } })}
          label={t('webview.sidebar-element-settings.codeSettings.borderLabel')}
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
      {/* Always available: only the extension knows whether a block is running with live output. */}
      <Divider />
      <div className="mt-2 flex flex-col gap-2">
        <Button
          appearance="secondary"
          className="justify-center gap-2"
          onClick={() => messages.send({ type: 'codeblockResetOutput', elementId: element.id })}
        >
          <ArrowUturnLeftIcon className="size-4" />
          {t('webview.sidebar-element-settings.codeSettings.resetOutput')}
        </Button>
        <Button
          appearance="secondary"
          className="justify-center gap-2"
          onClick={() => messages.send({ type: 'codeblockResetAllOutputs' })}
        >
          <ArrowUturnLeftIcon className="size-4" />
          <ArrowUturnLeftIcon className="size-4" />
          {t('webview.sidebar-element-settings.codeSettings.resetAllOutputs')}
        </Button>
      </div>
    </>
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
