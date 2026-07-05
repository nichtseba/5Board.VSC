import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Dropdown } from 'vscrui';
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

type Props = {
  element: EditorElement<EditorElementType.Text>;
};
export function TextSettings({ element }: Props) {
  const { t } = useLocalization();
  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.textSettings.title')}
        icon="symbol-string"
      >
        <SettingsField>
          <Dropdown
            options={[
              { value: 'Arial', label: 'Arial' },
              { value: 'Schriftart2', label: 'Schriftart2' },
              { value: 'Schriftart3', label: 'Schriftart3' },
            ]}
            value="Arial"
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
          <Dropdown
            options={[
              { value: 'schwarz', label: 'schwarz' },
              { value: 'rot', label: 'rot' },
              { value: 'gelb', label: 'gelb' },
              { value: 'grün', label: 'grün' },
              { value: 'blau', label: 'blau' },
              { value: 'orange', label: 'orange' },
              { value: 'lila', label: 'lila' },
            ]}
            value="schwarz"
          />
        </SettingsField>
        <hr className="border-editor-sticky-scroll-shadow" />
        <SettingsField>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3 mt-4">
            <BoldButton element={element} />
            <ItalicButton element={element} />
            <StrikeButton element={element} />
            <UnderlineButton element={element} />
            <CodeButton element={element} />
          </div>
        </SettingsField>
        <hr className="border-editor-sticky-scroll-shadow" />
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
