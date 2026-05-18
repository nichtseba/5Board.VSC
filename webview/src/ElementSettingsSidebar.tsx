import { init } from './init';
import { EditorElement, EditorElementType } from '5board.vsc-common/dist/Element';
import HeadingSettings from './components/sidebar/HeadingSettings';
import './components/sidebar/layout/sidebar.css';

type SettingsProps<T extends EditorElementType> = {
  element: EditorElement<T>;
};

/**
 * Mapping of element types to their settings components.
 */
const SETTINGS_COMPONENTS = {
  [EditorElementType.Heading]: HeadingSettings,
} as const satisfies {
  [Type in EditorElementType]: React.ComponentType<SettingsProps<Type>>;
};

export default function ElementSettingsSidebar() {
  const selectedElement: EditorElement = {
    id: '123',
    type: EditorElementType.Heading,
    data: {
      level: 1,
      content: '',
    },
    yPos: 0,
    height: 0,
  }; // Todo: replace with real data from extension

  if (!selectedElement) {
    return (
      <div className="element-controls-tab">
        <p>No element selected</p>
      </div>
    );
  }

  const SettingsComponent = SETTINGS_COMPONENTS[selectedElement.type];

  if (!SettingsComponent) {
    return (
      <div className="element-controls-tab">
        <p>Unsupported element type: {selectedElement.type}</p>
      </div>
    );
  }

  return <SettingsComponent element={selectedElement} />;
}

init(ElementSettingsSidebar);
