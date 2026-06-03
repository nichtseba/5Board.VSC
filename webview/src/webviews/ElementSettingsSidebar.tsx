import { init } from '../app/init';
import { useEffect } from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import { HeadingSettings } from '../components/sidebar/HeadingSettings';
import { useMessageService } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

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
  const messages = useMessageService();
  const { t } = useLocalization();
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

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  let content: React.ReactNode;

  if (!selectedElement) {
    content = (
      <div className="element-controls-tab">
        <p>{t('webview.sidebar-element-settings.noElementSelected')}</p>
      </div>
    );
  } else {
    const SettingsComponent = SETTINGS_COMPONENTS[selectedElement.type];

    if (!SettingsComponent) {
      content = (
        <>
          <div className="element-controls-tab">
            <p>{t('webview.sidebar-element-settings.unsupportedElement')}</p>
          </div>
        </>
      );
    } else {
      content = <SettingsComponent element={selectedElement} />;
    }
  }

  return <SidebarShell>{content}</SidebarShell>;
}

init(ElementSettingsSidebar);
