import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';

type Props = {
  element: EditorElement<EditorElementType.Text>;
};
export function TextSettings({ element }: Props) {
  return (
    <>
      <SettingsPanel title={'Text'} icon="text-size">
        <SettingsField label={'Todo'}>
          <p>Add Text settings here {element?.type}</p>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
