import { useEffect, useRef, useState } from 'react';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { BoardDocument } from '5board.vsc-common';
import { init } from '../app/init';
import EditorCanvas from '../components/canvas/EditorCanvas';

export default function Editor() {
  const messages = useMessageService();
  const [document, setDocument] = useState<BoardDocument | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      messages.send({ type: 'cursorMove', x, y });
    });
    console.log(`Mouse Position: (${x}, ${y})`); // dev tools
  };

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const top = window.document.documentElement.scrollTop;
      const left = window.document.documentElement.scrollLeft;

      messages.send({
        type: 'scroll',
        top,
        left,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useOnMessage((msg) => {
    console.log('Received message in Editor:', msg.type);
    if (msg.type === 'updateDocument' || msg.type === 'init') {
      setDocument(msg.document);
    }
  });

  useEffect(() => {
    const setFocus = () => {
      messages.send({ type: 'focus' });
    };
    window.addEventListener('focus', setFocus);
    return () => {
      window.removeEventListener('focus', setFocus);
    };
  }, []);
  return (
    <>
      <p>
        Document: <code>{JSON.stringify(document, null, 2)}</code>
      </p>
      <div onMouseMove={handleMouseMove}>{document && <EditorCanvas document={document} />}</div>
    </>
  );
}

init(Editor);
