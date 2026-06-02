import type React from 'react';
import { init } from '../app/init';
import { useEffect, useState } from 'react';
import { EditorElement, EditorElementType, AppState } from '5board.vsc-common';
import ElementSettings from '../components/sidebar/elementSettings/ElementSettings';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { useLocalization } from '../providers/LocalizationProvider';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';

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
      <div>
        <p>{t('webview.sidebar-element-settings.noElementSelected')}</p>
      </div>
    );
  } else {
    content = <ElementSettings element={selectedElement} />;
  }

  return (
    <SidebarShell>
      {content}
      {t('webview.sidebar-element-settings.selectedElement')}: {state.selectedElementId ?? '–'}
    </SidebarShell>
  );
}

init(ElementSettingsSidebar);
