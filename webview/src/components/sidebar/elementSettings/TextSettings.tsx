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
  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.textSettings.title')}
        icon="symbol-string"
      >
        <SettingsField>
          <FontFamilyDropdown
            value={element.data.tiptap?.marks?.textStyle?.fontFamily ?? 'inter'}
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
          <Dropdown
            options={[
              { value: '9', label: '9' },
              { value: '10', label: '10' },
              { value: '11', label: '11' },
              { value: '12', label: '12' },
              { value: '14', label: '14' },
              { value: '16', label: '16' },
              { value: '20', label: '20' },
            ]}
            value="11"
          />
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
