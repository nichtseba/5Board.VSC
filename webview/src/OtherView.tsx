import { useEffect, useState } from 'react';
import type { AppState } from '5board.vsc-common';
import { useMessageService, useOnMessage } from './services/MessageService';
import { init } from './init';

export default function OtherView() {
  const messages = useMessageService();
  const [state, setState] = useState<AppState>({ counter: 0, selectedElementId: null });

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
      <h1>5Board Sidebar Treeview</h1>
      <h2>Counter: {state.counter}</h2>
    </div>
  );
}

init(OtherView);
