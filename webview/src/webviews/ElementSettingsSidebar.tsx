import { init } from '../app/init';
import { useEffect, useState } from 'react';
import { EditorElement, EditorElementType, AppState } from '5board.vsc-common';
import { HeadingSettings } from '../components/sidebar/HeadingSettings';
import { useMessageService, useOnMessage } from '../services/MessageService';
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
  const [state, setState] = useState<AppState>({ selectedElementId: null });
  const { t } = useLocalization();
  const selectedElement: EditorElement = {
    id: '123',
    type: EditorElementType.Heading,
    data: {
      level: 1,
      content: '',
    },
    layout: {
      xPos: 0,
      yPos: 0,
      width: 0,
      height: 0,
    },
    style: {
      visible: true,
    },
  }; // Todo: replace with real data from extension

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'init' || msg.type === 'updateContent') {
      setState(msg.state);
    }
  });

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

  return (
    <SidebarShell>
      {content}
      {t('webview.sidebar-element-settings.selectedElement')}: {state.selectedElementId ?? '–'}
    </SidebarShell>
  );
}

init(ElementSettingsSidebar);
