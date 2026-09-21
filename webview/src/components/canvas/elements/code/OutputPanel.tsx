import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatMessage, parseOutputColors } from '5board.vsc-common';
import type { TranscriptSegment } from '5board.vsc-common';
import { Icons } from '../../../Icons';
import { useMessageService } from '../../../../services/MessageService';
import { useLocalization } from '../../../../providers/LocalizationProvider';
import type { BlockExecutionState } from '../../../../providers/ExecutionOutputProvider';

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
  if (segment.kind === 'system') {
    return (
      <span key={index} className="text-terminal-ansiYellow">
        {segment.text}
      </span>
    );
  }
  if (segment.kind === 'in') {
    // Italic rather than dimmed: dim greys are unreadable in some themes.
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
  collapsed: boolean;
  onRun: () => void;
  onOpenSource: () => void;
};

export function OutputPanel({
  elementId,
  state,
  readOnly,
  collapsed,
  onRun,
  onOpenSource,
}: OutputPanelProps) {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [input, setInput] = useState('');
  const outputVisible = !collapsed;
  // Also the input's minimum width, so keep the translations short.
  const inputPlaceholder = t('webview.codeblock.inputPlaceholder');
  const consoleRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const running = state?.running ?? false;
  const transcript = state?.transcript ?? [];
  const hasOutput = transcript.length > 0 || running;
  const showInput = running && !readOnly;
  const canToggle = hasOutput && !readOnly;

  useLayoutEffect(() => {
    const element = consoleRef.current;
    if (element && outputVisible) {
      element.scrollTop = element.scrollHeight;
    }
  }, [transcript, outputVisible]);

  useEffect(() => {
    if (showInput && outputVisible) {
      inputRef.current?.focus();
    }
  }, [showInput, outputVisible]);

  // An unsent line must not carry over into the next run.
  useEffect(() => {
    setInput('');
  }, [state?.runId]);

  const sendInput = () => {
    messages.send({ type: 'codeblockInput', elementId, text: `${input}\n` });
    setInput('');
  };

  return (
    <div className="border-t border-editor-widget-border">
      <div className="px-3 py-1 font-sans text-base bg-panel-background flex items-center gap-2">
        <ActionButton
          variant="title"
          disabled={!canToggle}
          dimmed={!hasOutput}
          onClick={() =>
            messages.send({ type: 'codeblockSetOutputCollapsed', elementId, collapsed: !collapsed })
          }
        >
          <span>{t('webview.codeblock.output')}</span>
          <Icons name={outputVisible && hasOutput ? 'chevron-up' : 'chevron-down'} />
        </ActionButton>
        <ActionButton
          title={t('webview.codeblock.copyOutput')}
          disabled={transcript.length === 0}
          onClick={() =>
            messages.send({
              type: 'copyToClipboard',
              text: transcript.map((segment) => segment.text).join(''),
            })
          }
        >
          <Icons name="copy" />
        </ActionButton>

        <div className="ml-auto flex items-center gap-2.5">
          <ActionButton title={t('webview.codeblock.openSource')} onClick={onOpenSource}>
            <Icons name="go-to-file" />
          </ActionButton>
          {/* Stop replaces Run while a program runs, so restarting is deliberately two steps. */}
          {running && !readOnly ? (
            <ActionButton
              variant="primary"
              title={t('webview.codeblock.stop')}
              onClick={() => messages.send({ type: 'codeblockStop', elementId })}
            >
              <Icons name="debug-stop" />
            </ActionButton>
          ) : (
            <ActionButton
              variant="primary"
              title={t('webview.codeblock.run')}
              disabled={readOnly}
              onClick={onRun}
            >
              <Icons name="run" />
            </ActionButton>
          )}
        </div>
      </div>

      {hasOutput && outputVisible && (
        <pre
          ref={consoleRef}
          onClick={() => showInput && inputRef.current?.focus()}
          className="m-0 px-3 py-2 font-mono text-editor leading-relaxed overflow-auto max-h-[calc(10lh+1rem)] text-terminal-foreground"
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
                // Ctrl+D on an empty line sends EOF, like in a terminal.
                if (e.key === 'd' && e.ctrlKey && input === '') {
                  e.preventDefault();
                  messages.send({ type: 'codeblockEndInput', elementId });
                }
              }}
              placeholder={inputPlaceholder}
              // Grows with the input so neither placeholder nor long lines get clipped.
              style={{ width: `${Math.max(inputPlaceholder.length, input.length) + 1}ch` }}
              className="bg-transparent border-none outline-none p-0 font-mono text-editor text-terminal-foreground placeholder:text-disabledForeground placeholder:opacity-60"
            />
          )}
          {state?.exit && (
            <span
              className={
                state.exit.success ? 'text-terminal-ansiBrightBlack' : 'text-terminal-ansiRed'
              }
            >
              {'\n' +
                formatMessage(t('webview.codeblock.exitCode'), {
                  code: state.exit.exitCode ?? t('webview.codeblock.exitCodeNone'),
                })}
            </span>
          )}
        </pre>
      )}
    </div>
  );
}

type ActionButtonVariant = 'title' | 'flat' | 'primary';

const VARIANT_COLORS: Record<ActionButtonVariant, { normal: string; dimmed: string }> = {
  title: {
    normal: 'text-panelTitle-activeForeground',
    dimmed: 'text-disabledForeground opacity-50',
  },
  flat: { normal: 'text-tab-activeForeground', dimmed: 'text-disabledForeground opacity-50' },
  primary: { normal: 'text-button-foreground', dimmed: 'text-button-foreground opacity-50' },
};

type ActionButtonProps = {
  variant?: ActionButtonVariant;
  disabled?: boolean;
  /** Greyed out because there is nothing to act on. Defaults to `disabled`. */
  dimmed?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
};

function ActionButton({
  variant = 'flat',
  disabled = false,
  dimmed = disabled,
  title,
  onClick,
  children,
}: ActionButtonProps) {
  const primary = variant === 'primary';
  const colors = VARIANT_COLORS[variant];
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-1.5 py-1 font-sans text-base rounded-xs border-none ${
        primary ? 'bg-button-background' : 'bg-transparent'
      } ${variant === 'title' ? 'font-semibold uppercase tracking-wide' : ''} ${
        dimmed ? colors.dimmed : colors.normal
      } ${
        disabled
          ? 'cursor-default'
          : `cursor-pointer ${primary ? 'hover:bg-button-hover-background' : 'hover:bg-list-hover-background'}`
      }`}
    >
      {children}
    </button>
  );
}
