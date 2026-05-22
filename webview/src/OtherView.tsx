import { useEffect, useState } from 'react';
import type { AppState } from '5board.vsc-common';
import { useMessageService, useOnMessage } from './services/MessageService';
import { init } from './init';

export default function OtherView() {
  const messages = useMessageService();
  const [, setState] = useState<AppState>({ selectedElementId: null });

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
    </div>
  );
}

init(OtherView);
