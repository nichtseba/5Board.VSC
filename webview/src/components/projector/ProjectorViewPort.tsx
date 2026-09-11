import { useState } from 'react';
import { useOnMessage } from '../../services/MessageService';

// Projector viewport aka projector rectangle in Editor
export type ProjectorViewport = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// Renders the rectangle that mirrors the projector's visible viewport on the editor canvas.
export default function ProjectorViewPort() {
  const [viewport, setViewport] = useState<ProjectorViewport | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'viewportUpdate') {
      setViewport(msg.viewport);
    }
  });

  if (!viewport) {
    return null;
  }

  return (
    <div
      className="absolute border-2 pointer-events-none z-9999 border-activity-error-badge-background"
      style={{
        left: viewport.left,
        top: viewport.top,
        width: viewport.width,
        height: viewport.height,
      }}
    />
  );
}
