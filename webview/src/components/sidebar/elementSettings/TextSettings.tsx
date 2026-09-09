import {
  EditorElement,
  EditorElementType,
  PROJECTOR_POINTER_PRESET_COLORS,
} from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Divider } from 'vscrui';
import { FontFamilyDropdown } from './components/FontFamilyDropdown';
import SettingsField from '../layout/SettingsField';
import {
  AlignCenterButton,
  AlignJustifyButton,
  AlignLeftButton,
  AlignRightButton,
  BoldButton,
  CodeButton,
  ItalicButton,
  StrikeButton,
  UnderlineButton,
} from './components/TextSettingsButton';
import { useMessageService } from '../../../services/MessageService';
import ColorSelector from '../components/ColorSelector';

type Props = {
  element: EditorElement<EditorElementType.Text>;
};
export function TextSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const fontSize = element.data.tiptap?.marks?.textStyle?.fontSize;
  const fontSizeValue = fontSize ? parseInt(fontSize, 10) : '';
  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.textSettings.title')}
        icon="symbol-string"
      >
        <SettingsField>
          <FontFamilyDropdown
            value={element.data.tiptap?.marks?.textStyle?.fontFamily ?? 'default'}
            onChange={(font) => {
              messages.send({
                type: 'textEditorCommand',
                command: {
                  type: 'setFontFamily',
                  font,
                },
              });
            }}
          />
          <SettingsField
            label={t('webview.sidebar-element-settings.headingSettings.fontSize')}
            inline
          >
            <input
              type="number"
              min={1}
              value={fontSizeValue}
              onChange={(e) => {
                messages.send({
                  type: 'textEditorCommand',
                  command: {
                    type: 'setFontSize',
                    size: e.target.value,
                  },
                });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();

                  messages.send({
                    type: 'textEditorCommand',
                    command: {
                      type: 'focus',
                    },
                  });
                }
              }}
              className="w-20 rounded-xs border border-dropdown-border bg-input-background px-2 py-[3px] text-input-foreground [color-scheme:light_dark] focus:border-focus-border focus:outline-none"
            />
          </SettingsField>
          <ColorSelector
            color={element.data.tiptap?.marks?.textStyle?.color}
            onChange={(color) => {
              messages.send({
                type: 'textEditorCommand',
                command: {
                  type: 'setTextColor',
                  color,
                },
              });
            }}
            presets={PROJECTOR_POINTER_PRESET_COLORS}
            label={t('webview.sidebar-element-settings.textSettings.textColor')}
            customColorLabel={t('webview.sidebar.projectorSettings.customColor')}
          />
          <ColorSelector
            color={element.style.backgroundColor}
            onChange={(color) => {
              messages.send({
                type: 'updateElement',
                id: element.id,
                changes: { style: { ...element.style, backgroundColor: color } },
              });
            }}
            presets={PROJECTOR_POINTER_PRESET_COLORS}
            label={t('webview.sidebar-element-settings.textSettings.backgroundColor')}
            customColorLabel={t('webview.sidebar.projectorSettings.customColor')}
          />
        </SettingsField>
        <Divider />
        <SettingsField>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3 mt-4">
            <BoldButton element={element} />
            <ItalicButton element={element} />
            <StrikeButton element={element} />
            <UnderlineButton element={element} />
            <CodeButton element={element} />
          </div>
        </SettingsField>
        <Divider />
        <SettingsField>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3 mt-4">
            <AlignLeftButton element={element} />
            <AlignCenterButton element={element} />
            <AlignRightButton element={element} />
            <AlignJustifyButton element={element} />
          </div>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
