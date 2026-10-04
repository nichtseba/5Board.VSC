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
import { Button, Divider, Dropdown, DropdownOption } from 'vscrui';
import { BoldIcon, ItalicIcon, UnderlineIcon } from '@heroicons/react/24/outline';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import ColorSelector from '../components/CompactColorSelector';
import { FontSizeInput } from './components/FontSizeInput';
import { FontFamilyDropdown } from './components/FontFamilyDropdown';
import { getCommonHeadingLevelSettings } from './utils/getCommonHeadingLevelSettings';
import { getCommonValue } from './utils/getCommonValue';
import { TransformationSettings } from './TransformationSettings';
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

  const handleLevelSettingsChange = (
    changes: HeadingLevelSettings,
    clear?: (keyof HeadingLevelSettings)[],
  ) => {
    const levels = [...new Set(elements.map((element) => element.data.level))];

    for (const level of levels) {
      messages.send({
        type: 'updateHeadingLevelSettings',
        level,
        changes,
        clear,
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
        <TransformationSettings elements={elements} />
        <Divider />
        <SettingsField label={t('webview.sidebar-element-settings.headingSettings.title')}>
          <div className="flex gap-2">
            <Dropdown
              className="w-20"
              title={t('webview.sidebar-element-settings.headingSettings.levelLabel')}
              aria-label={t('webview.sidebar-element-settings.headingSettings.levelLabel')}
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
            <Dropdown
              className="min-w-0 flex-1"
              title={t('webview.sidebar-element-settings.headingSettings.numberingLabel')}
              aria-label={t('webview.sidebar-element-settings.headingSettings.numberingLabel')}
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
          </div>
        </SettingsField>
        <Divider />
        <SettingsField label={t('webview.sidebar-element-settings.textSettings.fontSettings')}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <FontFamilyDropdown
                value={commonLevelSettings.fontFamily ?? 'default'}
                onChange={(fontFamily) => {
                  if (fontFamily === 'default') {
                    handleLevelSettingsChange({}, ['fontFamily']);
                    return;
                  }
                  handleLevelSettingsChange({ fontFamily });
                }}
              />
              <FontSizeInput
                value={commonLevelSettings.fontSize ?? ''}
                onChange={handleFontSizeChange}
              />
            </div>
            <ColorField
              value={commonLevelSettings.color}
              label={t('webview.sidebar-element-settings.textSettings.textColor')}
              onChange={(color) => handleLevelSettingsChange({ color })}
            />
            <ColorField
              value={commonLevelSettings.backgroundColor}
              label={t('webview.sidebar-element-settings.textSettings.highlightColor')}
              onChange={(backgroundColor) => {
                if (backgroundColor === undefined) {
                  handleLevelSettingsChange({}, ['backgroundColor']);
                  return;
                }
                handleLevelSettingsChange({ backgroundColor });
              }}
              allowNone
            />
          </div>
        </SettingsField>
        <Divider />
        <SettingsField label={t('webview.sidebar-element-settings.textSettings.decoration')}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={commonLevelSettings.fontWeight === 'bold' ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.bold')}
              aria-label={t('webview.sidebar-element-settings.headingSettings.bold')}
              aria-pressed={commonLevelSettings.fontWeight === 'bold'}
              onClick={() =>
                handleLevelSettingsChange({
                  fontWeight: commonLevelSettings.fontWeight === 'bold' ? 'normal' : 'bold',
                })
              }
            >
              <BoldIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={commonLevelSettings.fontStyle === 'italic' ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.italic')}
              aria-label={t('webview.sidebar-element-settings.headingSettings.italic')}
              aria-pressed={commonLevelSettings.fontStyle === 'italic'}
              onClick={() =>
                handleLevelSettingsChange({
                  fontStyle: commonLevelSettings.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
            >
              <ItalicIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={commonLevelSettings.textDecoration?.underline ? 'primary' : 'secondary'}
              title={t('webview.sidebar-element-settings.headingSettings.underline')}
              aria-label={t('webview.sidebar-element-settings.headingSettings.underline')}
              aria-pressed={commonLevelSettings.textDecoration?.underline ?? false}
              onClick={() =>
                handleLevelSettingsChange({
                  textDecoration: {
                    underline: !commonLevelSettings.textDecoration?.underline,
                  },
                })
              }
            >
              <UnderlineIcon className="size-5" />
            </Button>
          </div>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}

function ColorField({
  value,
  onChange,
  allowNone,
  label,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  allowNone?: boolean;
  label?: string;
}) {
  const { t } = useLocalization();
  return (
    <ColorSelector
      color={value}
      allowNone={allowNone}
      onChange={onChange}
      presets={PROJECTOR_POINTER_PRESET_COLORS}
      label={label}
      customColorLabel={t('webview.sidebar.projectorSettings.customColor')}
    />
  );
}
