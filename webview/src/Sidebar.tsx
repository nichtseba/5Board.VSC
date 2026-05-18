import { useState } from 'react';
import { init } from './init';
import { Button } from 'vscrui';
import { ToolItem } from '5board.vsc-common';
import './Sidebar.css';

const tools: ToolItem[] = [
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
];

export default function Sidebar() {
  const [selected, setSelected] = useState('code');

  function handleToolClick(tool: ToolItem) {
    setSelected(tool.id);
    // TODO: send message to extension to change active tool
  }

  return (
    <div className="sidebar">
      <div className="tool-grid">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            title={tool.label}
            appearance={selected === tool.id ? 'primary' : 'secondary'}
            className="tool-button"
            onClick={() => handleToolClick(tool)}
          >
            <span className={`codicon codicon-${tool.icon}`} />

            {/* <span className="tool-label">{tool.label}</span> */}
          </Button>
        ))}
      </div>
    </div>
  );
}

init(Sidebar);
