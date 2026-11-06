import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

const getMermaidTheme = () => {
  const body = document.body;

  console.log('VS Code Theme Classes:', body.className);

  //Check if the user uses any dark or light mode (called default)
  if (body.classList.contains('vscode-dark') || body.classList.contains('vscode-high-contrast')) {
    return 'dark';
  }

  return 'default';
};

//Initialize Mermaid without automatically rendering elements in the document.
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: getMermaidTheme(),
});

/**
 * Renders a Mermaid diagram element.
 */
export function MermaidElement({ element }: EditorElementProps<EditorElementType.Mermaid>) {
  const generatedId = useId();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        const result = await mermaid.render(id, element.data.source);

        if (cancelled) return;

        setSvg(result.svg);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : String(err));
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [element.data.source, generatedId]);

  const { backgroundColor, border } = element.style;
  const cssBorderStyle =
    border?.style === 'dashed' || border?.style === 'dotted' ? border.style : 'solid';

  return (
    <>
      <style>
        {`
          .mermaid-container svg {
            width: 100%;
            height: auto;
            max-width: 100%;
          }
        `}
      </style>
      <div
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          backgroundColor,
          opacity: element.style.opacity ?? 1,
          border: border?.color
            ? `${border.width ?? 1}px ${cssBorderStyle} ${border.color}`
            : undefined,
          borderRadius: border?.radius,
          overflow: 'hidden',
        }}
        className="flex items-center justify-center"
      >
        {error ? (
          <div className="p-2 text-sm text-red-500">Mermaid rendering error: {error}</div>
        ) : svg ? (
          <div
            className="mermaid-container flex h-full w-full items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="text-sm opacity-60">Rendering diagram...</div>
        )}
      </div>
    </>
  );
}
