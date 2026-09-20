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
// import {
//   AlignCenterButton,
//   AlignJustifyButton,
//   AlignLeftButton,
//   AlignRightButton,
//   BoldButton,
//   BulletListButton,
//   CodeButton,
//   ItalicButton,
//   OrderedListButton,
//   StrikeButton,
//   UnderlineButton,
// } from './components/TextSettingsButton';
import { useMessageService } from '../../../services/MessageService';
import ColorSelector from '../components/ColorSelector';
import { FontSizeInput } from './components/FontSizeInput';
import { getCommonValue } from './utils/getCommonValue';
import { CommonSettings } from './CommonSettings';

type Props = {
  elements: EditorElement<EditorElementType.Text>[];
};
export function TextSettings({ elements }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const fontFamily = getCommonValue(
    elements.map((element) => element.data.tiptap?.marks?.textStyle?.fontFamily ?? 'default'),
  );
  const fontSize = getCommonValue(
    elements.map((element) => element.data.tiptap?.marks?.textStyle?.fontSize),
  );
  const fontSizeValue = fontSize ? parseInt(fontSize, 10) : '';
  const lineHeight = getCommonValue(
    elements.map((element) => element.data.tiptap?.marks?.textStyle?.lineHeight ?? '1.0'),
  );
  const textColor = getCommonValue(
    elements.map((element) => element.data.tiptap?.marks?.textStyle?.color),
  );
  const highlightColor = getCommonValue(
    elements.map((element) => element.data.tiptap?.marks?.textStyle?.backgroundColor),
  );
  const backgroundColor = getCommonValue(elements.map((element) => element.style.backgroundColor));
  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.textSettings.title')}
        icon="symbol-string"
      >
        <SettingsField>
          <CommonSettings elements={elements} />
        </SettingsField>
        <Divider />
        <SettingsField>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <FontFamilyDropdown
              value={fontFamily}
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
              value={lineHeight}
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
            color={textColor}
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
            color={highlightColor}
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
            color={backgroundColor}
            onChange={(color) => {
              messages.send({
                type: 'updateElements',
                changes: elements.map((element) => ({
                  id: element.id,
                  changes: { style: { ...element.style, backgroundColor: color } },
                })),
              });
            }}
            presets={PROJECTOR_POINTER_PRESET_COLORS}
            label={t('webview.sidebar-element-settings.textSettings.backgroundColor')}
            customColorLabel={t('webview.sidebar.projectorSettings.customColor')}
          />
        </SettingsField>
        {/* <Divider />
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
        </SettingsField> */}
      </SettingsPanel>
    </>
  );
}
