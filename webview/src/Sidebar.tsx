import { useEffect, useState } from 'react';
import { init } from './app/init';
import { AppState } from '5board.vsc-common';
import './Sidebar.css';
import { useMessageService, useOnMessage } from './services/MessageService';
import { useLocalization } from './providers/LocalizationProvider';

/*const tools: ToolItem[] = [
  {
    id: 'pointer',
    label: 'Pointer',
    icon: 'cursor',
  },
  {
    id: 'text',
    label: 'Text',
    icon: 'symbol-string',
  },
  {
    id: 'heading',
    label: 'Heading',
    icon: 'text-size',
  },
  {
    id: 'link',
    label: 'Link',
    icon: 'link',
  },
  {
    id: 'code',
    label: 'Code',
    icon: 'code',
  },
  {
    id: 'image',
    label: 'Image',
    icon: 'file-media',
  },
];*/

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
    <>
      <div className="sidebar">
        <div className="tool-grid">
          {/*tools.map((tool) => (
            <Button
              key={tool.id}
              title={tool.label}
              appearance={selected === tool.id ? 'primary' : 'secondary'}
              className="tool-button"
              onClick={() => handleToolClick(tool)}
            >
              <span className={`codicon codicon-${tool.icon}`} />

              {/* <span className="tool-label">{tool.label}</span> /}
            </Button>
          ))*/}
        </div>
      </div>
      <div>
        <h1>{t('webview.sidebar.title')}</h1>
        <p>
          {t('webview.sidebar.selectedElement')}: {state.selectedElementId ?? '–'}
        </p>
      </div>
    </>
  );
}

init(Sidebar);
