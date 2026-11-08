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
        console.log('[Mermaid Debug] SVG:', result.svg);

        const noteGroups = [...result.svg.matchAll(/<g\b[^>]*id="[^"]*-note\d+"[^>]*>/g)];

        console.table(
          noteGroups.map((match, index) => ({
            order: index,
            svgId: match[0].match(/id="([^"]+)"/)?.[1],
            position: match.index,
          })),
        );

        if (cancelled) return;

        const parsed = new DOMParser().parseFromString(result.svg, 'text/html');
        const svgElement = parsed.querySelector('svg');

        const note0 = svgElement?.querySelector('[id$="-note0"]');
        const note1 = svgElement?.querySelector('[id$="-note1"]');

        if (note0 && note1 && note0.parentElement === note1.parentElement) {
          note1.after(note0);
        }

        setSvg(svgElement?.outerHTML ?? result.svg);
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
          .mermaid-container {
            overflow: auto;
            justify-content: flex-start;
          }

          .mermaid-container svg {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            flex-shrink: 0;
          }

          .mermaid-container .noteLabel foreignObject {
            overflow: visible;
          }

          .mermaid-container .noteLabel foreignObject div {
            white-space: normal !important;
            overflow-wrap: anywhere;
            word-break: normal;
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
            className="mermaid-container flex h-full w-full items-center"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="text-sm opacity-60">Rendering diagram...</div>
        )}
      </div>
    </>
  );
}
