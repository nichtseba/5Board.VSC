import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsField from '../layout/SettingsField';
import SettingsPanel from '../layout/SettingsPanel';

type Props = {
  element: EditorElement<EditorElementType.Arrow>;
};

export function ArrowSettings({ element }: Props) {
  return (
    <SettingsPanel title="Arrow" icon="arrow-right">
      <SettingsField label="Start point">
        <p>
          {element.data.points && element.data.points.length > 0
            ? `${element.data.points[0].x}, ${element.data.points[0].y}`
            : '—'}
        </p>
      </SettingsField>

      <SettingsField label="End point">
        <p>
          {element.data.points && element.data.points.length > 0
            ? `${element.data.points[element.data.points.length - 1].x}, ${
                element.data.points[element.data.points.length - 1].y
              }`
            : '—'}
        </p>
      </SettingsField>

      <SettingsField label="Stroke width">
        <p>{element.style?.border?.width ?? 'default'}</p>
      </SettingsField>

      <SettingsField label="Stroke color">
        <p>{element.style?.color ?? 'default'}</p>
      </SettingsField>

      <SettingsField label="All points">
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(element.data.points ?? [], null, 2)}
        </pre>
      </SettingsField>
    </SettingsPanel>
  );
}
