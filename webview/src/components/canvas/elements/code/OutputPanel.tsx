import { useState } from 'react';
import { parseOutputColors } from '5board.vsc-common';
import type { CodeExecutionOutput } from '5board.vsc-common';
import { Icons } from '../../../Icons';
import { useMessageService } from '../../../../services/MessageService';

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

type OutputPanelProps = {
  output: CodeExecutionOutput | null | undefined;
  onRun: () => void;
  onOpenSource: () => void;
};

export function OutputPanel({ output, onRun, onOpenSource }: OutputPanelProps) {
  const messages = useMessageService();
  const [outputVisible, setOutputVisible] = useState(true);
  const hasOutput = output != null;

  return (
    <div className="border-t border-editor-widget-border">
      {/* Actionbar */}
      <div className="px-3 py-1 font-sans text-base bg-panel-background flex items-center gap-0.5">
        <button
          onClick={() => hasOutput && setOutputVisible((v) => !v)}
          disabled={!hasOutput}
          className={`flex items-center gap-1.5 px-1.5 py-1 font-sans text-base font-semibold uppercase tracking-wide rounded-xs border-none ${
            hasOutput
              ? 'text-panelTitle-activeForeground cursor-pointer hover:bg-list-hover-background'
              : 'text-disabledForeground cursor-default opacity-50'
          } bg-transparent`}
        >
          <span>Output</span>
          <Icons name={outputVisible && hasOutput ? 'chevron-up' : 'chevron-down'} />
        </button>
        <button
          title="Copy output"
          disabled={!hasOutput}
          onClick={() => {
            if (!output) return;
            const text = !output.success && output.stderr ? output.stderr : output.stdout;
            messages.send({ type: 'copyToClipboard', text });
          }}
          className={`flex items-center px-1.5 py-1 bg-transparent font-sans text-base rounded-xs border-none ${
            hasOutput
              ? 'text-tab-activeForeground cursor-pointer hover:bg-list-hover-background'
              : 'text-disabledForeground cursor-default opacity-50'
          }`}
        >
          <Icons name="copy" />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            title="Open source file"
            onClick={onOpenSource}
            className="flex items-center px-1.5 py-1 bg-transparent text-tab-activeForeground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-list-hover-background"
          >
            <Icons name="go-to-file" />
          </button>
          <button
            title="Run"
            onClick={onRun}
            className="flex items-center px-1.5 py-1 bg-button-background text-button-foreground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-button-hover-background"
          >
            <Icons name="run" />
          </button>
        </div>
      </div>

      {/* Output content */}
      {hasOutput && outputVisible && (
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
