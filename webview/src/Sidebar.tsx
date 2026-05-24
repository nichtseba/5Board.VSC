import { useEffect, useState } from 'react';
import type { AppState } from '5board.vsc-common';
import { useMessageService, useOnMessage } from './services/MessageService';
import { init } from './app/init';

export default function Sidebar() {
  const messages = useMessageService();
  const [state, setState] = useState<AppState>({ selectedElementId: null });

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
      <h1>5Board Sidebar</h1>
      <p>Ausgewähltes Element: {state.selectedElementId ?? '–'}</p>
    </div>
  );
}

init(Sidebar);
