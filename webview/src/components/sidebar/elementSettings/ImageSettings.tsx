import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';

type Props = {
  element: EditorElement<EditorElementType.Image>;
};

export function ImageSettings({ element }: Props) {
  const { src, altText, hideInExport, cropData } = element.data;

  return (
    <SettingsPanel title="Image" icon="image">
      <SettingsField label="Source">
        <input className="form-input w-full" type="text" value={src} readOnly />
      </SettingsField>
      <SettingsField label="Alt text">
        <input className="form-input w-full" type="text" value={altText ?? ''} readOnly />
      </SettingsField>
      <SettingsField label="Visibility">
        <p>{hideInExport ? 'Hidden in export' : 'Visible in export'}</p>
      </SettingsField>
      {cropData ? (
        <SettingsField label="Crop">
          <p>
            x: {cropData.cropX}, y: {cropData.cropY}, w: {cropData.cropWidth}, h:{' '}
            {cropData.cropHeight}
          </p>
        </SettingsField>
      ) : null}
    </SettingsPanel>
  );
}
