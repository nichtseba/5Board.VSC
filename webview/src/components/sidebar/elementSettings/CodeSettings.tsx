import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';

type Props = {
  element: EditorElement<EditorElementType.Code>;
};

export function CodeSettings({ element }: Props) {
  return (
    <SettingsPanel title="Code" icon="code">
      <SettingsField label="File name">
        <input
          className="form-input w-full"
          type="text"
          value={element.data.fileName ?? ''}
          readOnly
        />
      </SettingsField>
      <SettingsField label="Language">
        <input
          className="form-input w-full"
          type="text"
          value={element.data.language ?? ''}
          readOnly
        />
      </SettingsField>
      <SettingsField label="Code">
        <textarea
          className="form-textarea w-full min-h-[120px]"
          value={element.data.content}
          readOnly
        />
      </SettingsField>
      {element.data.output ? (
        <SettingsField label="Output">
          <textarea
            className="form-textarea w-full min-h-[80px]"
            value={element.data.output}
            readOnly
          />
        </SettingsField>
      ) : null}
    </SettingsPanel>
  );
}
