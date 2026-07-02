import {
  EditorElement,
  EditorElementType,
  HeadingLevelSettings,
  HeadingNumberingFormat,
  getHeadingLevelSettings,
  getHeadingNumberingFormat,
} from '5board.vsc-common';
import { Button, Dropdown, DropdownOption, TextField } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';

type Props = {
  element: EditorElement<EditorElementType.Heading>;
};
export function HeadingSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const document = useBoardDocument();
  const levelSettings = getHeadingLevelSettings(
    document?.content.headingSettings,
    element.data.level,
  );
  const numberingFormat = getHeadingNumberingFormat(document?.content.headingSettings);

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

  const handleNumberingChange = (value: string | DropdownOption | undefined) => {
    if (!value) {
      return;
    }

    const nextFormat = (typeof value === 'string' ? value : value.value) as HeadingNumberingFormat;

    messages.send({
      type: 'updateHeadingNumbering',
      numberingFormat: nextFormat,
    });
  };

  const handleLevelSettingsChange = (changes: HeadingLevelSettings) => {
    messages.send({
      type: 'updateHeadingLevelSettings',
      level: element.data.level,
      changes,
    });
  };

  const handleFontSizeChange = (value: string) => {
    const fontSize = Number(value);

    if (Number.isFinite(fontSize) && fontSize > 0) {
      handleLevelSettingsChange({ fontSize });
    }
  };

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
            value={String(element.data.level)}
            onChange={handleLevelChange}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.headingSettings.numberingLabel')}>
          <Dropdown
            options={[
              {
                value: 'none',
                label: t('webview.sidebar-element-settings.headingSettings.numberingNone'),
              },
              {
                value: 'decimal',
                label: t('webview.sidebar-element-settings.headingSettings.numberingDecimal'),
              },
              {
                value: 'lower-alpha',
                label: t('webview.sidebar-element-settings.headingSettings.numberingLowerAlpha'),
              },
              {
                value: 'upper-alpha',
                label: t('webview.sidebar-element-settings.headingSettings.numberingUpperAlpha'),
              },
              {
                value: 'lower-roman',
                label: t('webview.sidebar-element-settings.headingSettings.numberingLowerRoman'),
              },
              {
                value: 'upper-roman',
                label: t('webview.sidebar-element-settings.headingSettings.numberingUpperRoman'),
              },
            ]}
            value={numberingFormat}
            onChange={handleNumberingChange}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.headingSettings.fontFamily')}>
          <TextField
            value={levelSettings.fontFamily ?? ''}
            placeholder={t(
              'webview.sidebar-element-settings.headingSettings.fontFamilyPlaceholder',
            )}
            onChange={(fontFamily) => handleLevelSettingsChange({ fontFamily })}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.headingSettings.fontSize')}>
          <TextField value={String(levelSettings.fontSize ?? '')} onChange={handleFontSizeChange} />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.headingSettings.textStyle')}>
          <div className="flex gap-2">
            <Button
              appearance={levelSettings.fontWeight === 'bold' ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.bold')}
              onClick={() =>
                handleLevelSettingsChange({
                  fontWeight: levelSettings.fontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
            >
              <span className="codicon codicon-bold" />
            </Button>
            <Button
              appearance={levelSettings.fontStyle === 'italic' ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.italic')}
              onClick={() =>
                handleLevelSettingsChange({
                  fontStyle: levelSettings.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
            >
              <span className="codicon codicon-italic" />
            </Button>
            <Button
              appearance={levelSettings.textDecoration?.underline ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.underline')}
              onClick={() =>
                handleLevelSettingsChange({
                  textDecoration: {
                    underline: !levelSettings.textDecoration?.underline,
                  },
                })
              }
            >
              <span className="font-semibold underline">U</span>
            </Button>
          </div>
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.headingSettings.color')}>
          <ColorField
            value={levelSettings.color ?? ''}
            onChange={(color) => handleLevelSettingsChange({ color })}
          />
        </SettingsField>
        <SettingsField
          label={t('webview.sidebar-element-settings.headingSettings.backgroundColor')}
        >
          <ColorField
            value={levelSettings.backgroundColor ?? ''}
            onChange={(backgroundColor) => handleLevelSettingsChange({ backgroundColor })}
          />
        </SettingsField>
      </SettingsPanel>
    </>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        className="h-7 w-8 cursor-pointer border border-dropdown-border bg-input-background"
        value={toColorInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
      />
      <TextField value={value} placeholder="#000000" onChange={onChange} />
    </div>
  );
}

function toColorInputValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
}
