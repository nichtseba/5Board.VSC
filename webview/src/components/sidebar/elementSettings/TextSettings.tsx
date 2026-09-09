import {
  EditorElement,
  EditorElementType,
  PROJECTOR_POINTER_PRESET_COLORS,
} from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Divider, Dropdown } from 'vscrui';
import { FontFamilyDropdown } from './components/FontFamilyDropdown';
import SettingsField from '../layout/SettingsField';
import {
  AlignCenterButton,
  AlignJustifyButton,
  AlignLeftButton,
  AlignRightButton,
  BoldButton,
  BulletListButton,
  CodeButton,
  ItalicButton,
  OrderedListButton,
  StrikeButton,
  UnderlineButton,
} from './components/TextSettingsButton';
import { useMessageService } from '../../../services/MessageService';
import ColorSelector from '../components/ColorSelector';
import { FontSizeInput } from './components/FontSizeInput';

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
          <div className="mt-4 flex flex-wrap items-center gap-3">
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

            <FontSizeInput
              value={fontSizeValue}
              onChange={(size) => {
                messages.send({
                  type: 'textEditorCommand',
                  command: {
                    type: 'setFontSize',
                    size,
                  },
                });
              }}
              onConfirm={() => {
                messages.send({
                  type: 'textEditorCommand',
                  command: {
                    type: 'focus',
                  },
                });
              }}
            />

            <Dropdown
              title="Line Height"
              options={['1.0', '1.15', '1.5', '2.0', '2.5', '3.0']}
              className="w-max!"
              value={element.data.tiptap?.marks?.textStyle?.lineHeight ?? '1.0'}
              onChange={(height) => {
                if (typeof height !== 'string') return;
                messages.send({
                  type: 'textEditorCommand',
                  command: {
                    type: 'setLineHeight',
                    height,
                  },
                });
              }}
            />
          </div>
        </SettingsField>
        <Divider />
        <SettingsField>
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
            color={element.data.tiptap?.marks?.textStyle?.backgroundColor}
            onChange={(color) => {
              messages.send({
                type: 'textEditorCommand',
                command: {
                  type: 'setBackgroundColor',
                  color,
                },
              });
            }}
            presets={PROJECTOR_POINTER_PRESET_COLORS}
            label={t('webview.sidebar-element-settings.textSettings.highlightColor')}
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
            <BulletListButton element={element} />
            <OrderedListButton element={element} />
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
