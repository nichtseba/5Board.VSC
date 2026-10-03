import {
  EditorElement,
  EditorElementType,
  HeadingLevelSettings,
  HeadingNumberingFormat,
  HeadingNumberingStyle,
  PROJECTOR_POINTER_PRESET_COLORS,
  getHeadingLevelSettings,
  getHeadingNumberingEnabled,
  getHeadingNumberingStyle,
} from '5board.vsc-common';
import { Button, Divider, Dropdown, DropdownOption, TextField } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import ColorSelector from '../components/ColorSelector';
import { FontSizeInput } from './components/FontSizeInput';
import { getCommonHeadingLevelSettings } from './utils/getCommonHeadingLevelSettings';
import { getCommonValue } from './utils/getCommonValue';
import { CommonSettings } from './CommonSettings';
import GenericElementSettings from './GenericElementSettings';

type Props = {
  elements: EditorElement<EditorElementType.Heading>[];
};
export function HeadingSettings({ elements }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const document = useBoardDocument();

  const commonLevel = getCommonValue(elements.map((element) => element.data.level));

  const commonLevelSettings = getCommonHeadingLevelSettings(
    elements.map((element) =>
      getHeadingLevelSettings(document?.content.headingSettings, element.data.level),
    ),
  );

  const numberingEnabled = getHeadingNumberingEnabled(document?.content.headingSettings);
  const commonNumberingFormat = getCommonValue(
    elements.map((element) =>
      getHeadingNumberingStyle(document?.content.headingSettings, element.data.level),
    ),
  );

  const handleLevelChange = (value: string | DropdownOption | undefined) => {
    if (!value) {
      return;
    }
    const newLevel = typeof value === 'string' ? value : value.value;
    const level = parseInt(newLevel, 10) as 1 | 2 | 3 | 4 | 5 | 6;

    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          data: {
            ...element.data,
            level,
          },
        },
      })),
    });
  };

  const handleNumberingChange = (value: string | DropdownOption | undefined) => {
    if (!value) {
      return;
    }

    const nextFormat = (typeof value === 'string' ? value : value.value) as HeadingNumberingFormat;

    if (nextFormat === 'none') {
      messages.send({
        type: 'updateHeadingNumbering',
        enabled: false,
      });
      return;
    }

    const levels = [...new Set(elements.map((element) => element.data.level))];
    for (const level of levels) {
      messages.send({
        type: 'updateHeadingNumbering',
        enabled: true,
        level,
        numberingFormat: nextFormat as HeadingNumberingStyle,
      });
    }
  };

  const handleLevelSettingsChange = (changes: HeadingLevelSettings) => {
    const levels = [...new Set(elements.map((element) => element.data.level))];

    for (const level of levels) {
      messages.send({
        type: 'updateHeadingLevelSettings',
        level,
        changes,
      });
    }
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
        <GenericElementSettings element={elements[0]} />
        <Divider />
        <CommonSettings elements={elements} />
        <Divider />
        <SettingsField
          label={t('webview.sidebar-element-settings.headingSettings.levelLabel')}
          inline
        >
          <Dropdown
            className="w-24"
            options={[
              { value: '1', label: 'H1' },
              { value: '2', label: 'H2' },
              { value: '3', label: 'H3' },
              { value: '4', label: 'H4' },
              { value: '5', label: 'H5' },
              { value: '6', label: 'H6' },
            ]}
            value={commonLevel !== undefined ? String(commonLevel) : ''}
            placeholder={commonLevel === undefined ? '\u00A0' : undefined}
            onChange={handleLevelChange}
          />
        </SettingsField>
        <SettingsField
          label={`${t('webview.sidebar-element-settings.headingSettings.numberingLabel')} ${
            commonLevel !== undefined ? `H${commonLevel}` : ''
          }`}
        >
          <Dropdown
            options={[
              {
                value: 'none',
                label: t('webview.sidebar-element-settings.headingSettings.numberingNone'),
              },
              {
                value: 'decimal',
                label: '1, 2, 3',
              },
              {
                value: 'lower-alpha',
                label: 'a, b, c',
              },
              {
                value: 'upper-alpha',
                label: 'A, B, C',
              },
              {
                value: 'lower-roman',
                label: 'i, ii, iii',
              },
              {
                value: 'upper-roman',
                label: 'I, II, III',
              },
            ]}
            value={numberingEnabled ? (commonNumberingFormat ?? 'none') : 'none'}
            onChange={handleNumberingChange}
          />
        </SettingsField>
        <SettingsField label={t('webview.sidebar-element-settings.headingSettings.fontFamily')}>
          <TextField
            value={commonLevelSettings.fontFamily ?? ''}
            placeholder={t(
              'webview.sidebar-element-settings.headingSettings.fontFamilyPlaceholder',
            )}
            onChange={(fontFamily) => handleLevelSettingsChange({ fontFamily })}
          />
        </SettingsField>
        <SettingsField
          label={t('webview.sidebar-element-settings.headingSettings.fontSize')}
          inline
        >
          <FontSizeInput
            value={commonLevelSettings.fontSize ?? ''}
            onChange={handleFontSizeChange}
          />
        </SettingsField>
        <SettingsField
          label={t('webview.sidebar-element-settings.headingSettings.textStyle')}
          inline
        >
          <div className="flex gap-2">
            <Button
              appearance={commonLevelSettings.fontWeight === 'bold' ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.bold')}
              onClick={() =>
                handleLevelSettingsChange({
                  fontWeight: commonLevelSettings.fontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
            >
              <span className="codicon codicon-bold" />
            </Button>
            <Button
              appearance={commonLevelSettings.fontStyle === 'italic' ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.italic')}
              onClick={() =>
                handleLevelSettingsChange({
                  fontStyle: commonLevelSettings.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
            >
              <span className="codicon codicon-italic" />
            </Button>
            <Button
              appearance={commonLevelSettings.textDecoration?.underline ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.underline')}
              onClick={() =>
                handleLevelSettingsChange({
                  textDecoration: {
                    underline: !commonLevelSettings.textDecoration?.underline,
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
            value={commonLevelSettings.color}
            onChange={(color) => handleLevelSettingsChange({ color })}
          />
        </SettingsField>
        <SettingsField
          label={t('webview.sidebar-element-settings.headingSettings.backgroundColor')}
        >
          <ColorField
            value={commonLevelSettings.backgroundColor}
            onChange={(backgroundColor) => handleLevelSettingsChange({ backgroundColor })}
            allowNone
          />
        </SettingsField>
      </SettingsPanel>
    </>
  );
}

function ColorField({
  value,
  onChange,
  allowNone,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  allowNone?: boolean;
}) {
  const { t } = useLocalization();
  return (
    <ColorSelector
      color={value}
      allowNone={allowNone}
      onChange={onChange}
      themePresets={PROJECTOR_POINTER_PRESET_COLORS}
      customColorLabel={t('webview.sidebar.projectorSettings.customColor')}
    />
  );
}
