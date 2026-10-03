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
import ColorSelector from '../components/CompactColorSelector';
import { FontSizeInput } from './components/FontSizeInput';
import { getCommonValue } from './utils/getCommonValue';
import GenericElementSettings from './GenericElementSettings';
import { CommonSettings } from './CommonSettings';
import ElementStyleSettings from '../components/ElementStyleSettings';
import { getCommonElementStyle } from './utils/getCommonElementStyle';

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

  const updateStyle = (changes: Partial<(typeof elements)[number]['style']>) => {
    messages.send({
      type: 'updateElements',
      changes: elements.map((element) => ({
        id: element.id,
        changes: {
          style: { ...element.style, ...changes },
        },
      })),
    });
  };
  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.textSettings.title')}
        icon="symbol-string"
      >
        <GenericElementSettings element={elements[0]} />
        <Divider />
        <CommonSettings elements={elements} />
        <Divider />
        <ElementStyleSettings
          style={getCommonElementStyle(elements)}
          onChange={updateStyle}
          allowNone
          editableProperties={[
            'backgroundColor',
            'opacity',
            'borderColor',
            'borderWidth',
            'borderRadius',
            'borderStyle',
          ]}
        />
        <Divider />
        <SettingsField label={t('webview.sidebar-element-settings.textSettings.fontSettings')}>
          <div className="flex flex-wrap items-center gap-3">
            <FontFamilyDropdown
              value={fontFamily}
              onChange={(font) => {
                messages.send({
                  type: 'textEditorCommand',
                  ids: elements.map((element) => element.id),
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
                  ids: elements.map((element) => element.id),
                  command: {
                    type: 'setFontSize',
                    size,
                  },
                });
              }}
              onConfirm={() => {
                messages.send({
                  type: 'textEditorCommand',
                  ids: elements.map((element) => element.id),
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
                  ids: elements.map((element) => element.id),
                  command: {
                    type: 'setLineHeight',
                    height,
                  },
                });
              }}
            />
          </div>
        </SettingsField>
        <SettingsField>
          <ColorSelector
            color={textColor}
            onChange={(color) => {
              messages.send({
                type: 'textEditorCommand',
                ids: elements.map((element) => element.id),
                command: {
                  type: 'setTextColor',
                  color: color!,
                },
              });
            }}
            presets={PROJECTOR_POINTER_PRESET_COLORS}
            label={t('webview.sidebar-element-settings.textSettings.textColor')}
            customColorLabel={t('webview.sidebar.projectorSettings.customColor')}
          />

          <ColorSelector
            color={highlightColor}
            allowNone
            onChange={(color) => {
              messages.send({
                type: 'textEditorCommand',
                ids: elements.map((element) => element.id),
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
        </SettingsField>
        <Divider />
        <SettingsField label={t('webview.sidebar-element-settings.textSettings.decoration')}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
            <BoldButton elements={elements} />
            <ItalicButton elements={elements} />
            <StrikeButton elements={elements} />
            <UnderlineButton elements={elements} />
            <CodeButton elements={elements} />
          </div>
        </SettingsField>
        <Divider />
        <SettingsField label={t('webview.sidebar-element-settings.textSettings.list')}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
            <BulletListButton elements={elements} />
            <OrderedListButton elements={elements} />
          </div>
        </SettingsField>
        <Divider />
        <SettingsField label={t('webview.sidebar-element-settings.textSettings.alignment')}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
            <AlignLeftButton elements={elements} />
            <AlignCenterButton elements={elements} />
            <AlignRightButton elements={elements} />
            <AlignJustifyButton elements={elements} />
          </div>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
