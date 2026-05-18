import { EditorElement, EditorElementType } from '5board.vsc-common';
import { Dropdown } from 'vscrui';
import SettingsField from './layout/SettingsField';
import SettingsPanel from './layout/SettingsPanel';

type Props = {
  element: EditorElement<EditorElementType.Heading>;
};
function HeadingSettings({ element }: Props) {
  return (
    <>
      <SettingsPanel type={element.type} icon="text-size">
        <SettingsField label="Level">
          <Dropdown
            options={[
              { value: '1', label: 'H1' },
              { value: '2', label: 'H2' },
              { value: '3', label: 'H3' },
              { value: '4', label: 'H4' },
              { value: '5', label: 'H5' },
              { value: '6', label: 'H6' },
            ]}
            value={String(element?.data.level)}
          />
        </SettingsField>
      </SettingsPanel>
    </>
  );
}

export default HeadingSettings;
