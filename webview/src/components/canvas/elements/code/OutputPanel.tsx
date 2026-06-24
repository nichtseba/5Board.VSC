import { useState } from 'react';
import { parseOutputColors } from '5board.vsc-common';
import type { CodeExecutionOutput } from '5board.vsc-common';

/**
 * Maps the output color indices (see {@link parseOutputColors}) to terminal ANSI theme colors.
 * Order matches the documented palette: red, green, yellow, blue, magenta, cyan, white, gray.
 */
const OUTPUT_COLOR_CLASSES = [
  'text-terminal-ansiRed',
  'text-terminal-ansiGreen',
  'text-terminal-ansiYellow',
  'text-terminal-ansiBlue',
  'text-terminal-ansiMagenta',
  'text-terminal-ansiCyan',
  'text-terminal-ansiWhite',
  'text-terminal-ansiBrightBlack',
];

function renderColoredOutput(raw: string) {
  return parseOutputColors(raw).map((segment, index) =>
    segment.kind === 'colored' ? (
      <span key={index} className={OUTPUT_COLOR_CLASSES[segment.colorIndex] ?? ''}>
        {segment.value}
      </span>
    ) : (
      <span key={index}>{segment.value}</span>
    ),
  );
}

/** Collapsible panel showing a code block's latest execution output (stdout, or stderr on error). */
export function OutputPanel({ output }: { output: CodeExecutionOutput }) {
  const [outputVisible, setOutputVisible] = useState(true);

  return (
    <div className="border-t border-editor-widget-border">
      <button
        onClick={() => setOutputVisible((v) => !v)}
        className="w-full px-3 py-1 text-left font-sans text-base font-semibold uppercase tracking-wide text-panelTitle-activeForeground bg-panel-background border-none border-b border-panel-border flex items-center gap-2 cursor-pointer hover:bg-list-hover-background"
      >
        <span>{!output.success ? 'Output (Error)' : 'Output'}</span>
        <span
          className={`ml-auto codicon ${outputVisible ? 'codicon-chevron-up' : 'codicon-chevron-down'}`}
        />
      </button>

      {outputVisible && (
        <pre className="m-0 px-3 py-2 font-mono text-editor leading-relaxed overflow-x-auto bg-editor-background text-terminal-foreground">
          {!output.success && output.stderr ? (
            <span className="text-terminal-ansiRed">{output.stderr}</span>
          ) : (
            renderColoredOutput(output.stdout)
          )}
        </pre>
      )}
    </div>
  );
}
