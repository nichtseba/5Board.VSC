import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { parseOutputColors } from '5board.vsc-common';
import type { TranscriptSegment } from '5board.vsc-common';
import { Icons } from '../../../Icons';
import { useMessageService } from '../../../../services/MessageService';
import type { BlockExecutionState } from '../../../../providers/ExecutionOutputProvider';

/** Kept short on purpose: it sets the input box's minimum width, see the style below. */
const INPUT_PLACEHOLDER = 'Enter sends, Ctrl+D ends';

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

function renderSegment(segment: TranscriptSegment, index: number) {
  if (segment.kind === 'err') {
    return (
      <span key={index} className="text-terminal-ansiRed">
        {segment.text}
      </span>
    );
  }
  if (segment.kind === 'in') {
    // Set apart from the program's own output so it stays readable which lines were typed.
    // Italic rather than a dimmed colour: dim greys are close to unreadable in some themes.
    return (
      <span key={index} className="italic opacity-80">
        {segment.text}
      </span>
    );
  }
  return <span key={index}>{renderColoredOutput(segment.text)}</span>;
}

type OutputPanelProps = {
  elementId: string;
  state: BlockExecutionState | undefined;
  readOnly: boolean;
  onRun: () => void;
  onOpenSource: () => void;
};

export function OutputPanel({ elementId, state, readOnly, onRun, onOpenSource }: OutputPanelProps) {
  const messages = useMessageService();
  const [outputVisible, setOutputVisible] = useState(true);
  const [input, setInput] = useState('');
  const consoleRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const running = state?.running ?? false;
  const transcript = state?.transcript ?? [];
  const hasOutput = transcript.length > 0 || running;
  const showInput = running && !readOnly;

  // Follow the output the way a terminal does.
  useLayoutEffect(() => {
    const element = consoleRef.current;
    if (element && outputVisible) {
      element.scrollTop = element.scrollHeight;
    }
  }, [transcript, outputVisible]);

  useEffect(() => {
    if (showInput) {
      inputRef.current?.focus();
    }
  }, [showInput]);

  // A new run starts with an empty prompt. Otherwise a line that was typed but never sent
  // would reappear in the next run and be waiting at its first read.
  useEffect(() => {
    setInput('');
  }, [state?.runId]);

  const sendInput = () => {
    messages.send({ type: 'codeblockInput', elementId, text: `${input}\n` });
    setInput('');
  };

  return (
    <div className="border-t border-editor-widget-border">
      {/* Actionbar */}
      <div className="px-3 py-1 font-sans text-base bg-panel-background flex items-center gap-2">
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
            if (!transcript.length) return;
            messages.send({
              type: 'copyToClipboard',
              text: transcript.map((segment) => segment.text).join(''),
            });
          }}
          className={`flex items-center px-1.5 py-1 bg-transparent font-sans text-base rounded-xs border-none ${
            hasOutput
              ? 'text-tab-activeForeground cursor-pointer hover:bg-list-hover-background'
              : 'text-disabledForeground cursor-default opacity-50'
          }`}
        >
          <Icons name="copy" />
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          <button
            title="Open source file"
            onClick={onOpenSource}
            className="flex items-center px-1.5 py-1 bg-transparent text-tab-activeForeground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-list-hover-background"
          >
            <Icons name="go-to-file" />
          </button>
          {/* Stop takes the run button's place while a program runs, rather than sitting next to
              it: restarting means stopping first, and the actionbar stays this narrow. */}
          {running && !readOnly ? (
            <button
              title="Stop"
              onClick={() => messages.send({ type: 'codeblockStop', elementId })}
              className="flex items-center px-1.5 py-1 bg-button-background text-button-foreground font-sans text-base rounded-xs border-none cursor-pointer hover:bg-button-hover-background"
            >
              <Icons name="debug-stop" />
            </button>
          ) : (
            <button
              title="Run"
              onClick={onRun}
              disabled={readOnly}
              className={`flex items-center px-1.5 py-1 bg-button-background text-button-foreground font-sans text-base rounded-xs border-none ${
                readOnly
                  ? 'cursor-default opacity-50'
                  : 'cursor-pointer hover:bg-button-hover-background'
              }`}
            >
              <Icons name="run" />
            </button>
          )}
        </div>
      </div>

      {/* Output content — no own background, inherits the block surface (theme default or per-block override) */}
      {hasOutput && outputVisible && (
        <pre
          ref={consoleRef}
          onClick={() => showInput && inputRef.current?.focus()}
          className="m-0 px-3 py-2 font-mono text-editor leading-relaxed overflow-auto max-h-80 text-terminal-foreground"
        >
          {transcript.map(renderSegment)}
          {showInput && (
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendInput();
                  return;
                }
                // Ctrl+D on an empty line closes stdin, the same as in a terminal. Programs
                // that read until EOF need it to ever leave their loop.
                if (e.key === 'd' && e.ctrlKey && input === '') {
                  e.preventDefault();
                  messages.send({ type: 'codeblockEndInput', elementId });
                }
              }}
              placeholder={INPUT_PLACEHOLDER}
              // Grows with what is typed. A fixed width would clip both the placeholder and
              // any line longer than the box.
              style={{ width: `${Math.max(INPUT_PLACEHOLDER.length, input.length) + 1}ch` }}
              className="bg-transparent border-none outline-none p-0 font-mono text-editor text-terminal-foreground placeholder:text-disabledForeground placeholder:opacity-60"
            />
          )}
          {state?.exit && (
            <span
              className={
                state.exit.success ? 'text-terminal-ansiBrightBlack' : 'text-terminal-ansiRed'
              }
            >
              {`\n[Exit code ${state.exit.exitCode ?? 'none'}]`}
            </span>
          )}
        </pre>
      )}
    </div>
  );
}
