import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';

type Props = {
  element: EditorElement<EditorElementType.Shape>;
};

export function ShapeSettings({ element }: Props) {
  const points =
    element.data.shapeType === 'line' || element.data.shapeType === 'polygon'
      ? element.data.points
      : null;

  return (
    <SettingsPanel title="Shape" icon="symbol-property">
      <SettingsField label="Shape type">
        <p>{element.data.shapeType}</p>
      </SettingsField>
      <SettingsField label="Fill color">
        <p>{element.data.fillColor ?? 'transparent'}</p>
      </SettingsField>
      <SettingsField label="Stroke color">
        <p>{element.data.strokeColor ?? 'default'}</p>
      </SettingsField>
      <SettingsField label="Stroke width">
        <p>{element.data.strokeWidth ?? 1}</p>
      </SettingsField>
      {points ? (
        <SettingsField label="Points">
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(points, null, 2)}</pre>
        </SettingsField>
      ) : null}
    </SettingsPanel>
  );
}
