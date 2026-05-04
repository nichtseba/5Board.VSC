import { useEffect, useState } from 'react';
import type { AppState } from '5board.vsc-common';
import { useMessageService, useOnMessage } from './services/MessageService';
import { init } from './init';

export default function Sidebar() {
  const messages = useMessageService();
  const [state, setState] = useState<AppState>({ counter: 0 });

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
      <h2>Counter: {state.counter}</h2>
      <button onClick={() => messages.send({ type: 'counterIncrement' })}>+</button>
      <button onClick={() => messages.send({ type: 'counterDecrement' })}>−</button>
    </div>
  );
}

init(Sidebar);
