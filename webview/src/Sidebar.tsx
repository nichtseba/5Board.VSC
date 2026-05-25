import { useEffect, useState } from 'react';
import { init } from './app/init';
import type { AppState } from '5board.vsc-common';
import { useMessageService, useOnMessage } from './services/MessageService';
import { useLocalization } from './providers/LocalizationProvider';

export default function Sidebar() {
  const messages = useMessageService();
  const [state, setState] = useState<AppState>({ selectedElementId: null });
  const { t } = useLocalization();

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useOnMessage((msg) => {
    if (msg.type === 'init' || msg.type === 'updateContent') {
      setState(msg.state);
    }
  });

  return (
    <div>
      <h1>{t('webview.sidebar.title')}</h1>
      <p>
        {t('webview.sidebar.selectedElement')}: {state.selectedElementId ?? '–'}
      </p>
    </div>
  );
}

init(Sidebar);
