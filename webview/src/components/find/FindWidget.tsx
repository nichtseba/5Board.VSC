import { useEffect, useRef, useState } from 'react';
import { TranslationKey } from '5board.vsc-common';
import { useLocalization } from '../../providers/LocalizationProvider';
import { useFind } from '../../providers/FindProvider';
import { FindFlags } from '../../services/findMatches';

const FLAG_TOGGLES: { flag: keyof FindFlags; icon: string; labelKey: TranslationKey }[] = [
  { flag: 'matchCase', icon: 'case-sensitive', labelKey: 'webview.find.matchCase' },
  { flag: 'wholeWord', icon: 'whole-word', labelKey: 'webview.find.wholeWord' },
  { flag: 'regex', icon: 'regex', labelKey: 'webview.find.useRegex' },
];

const ICON_BUTTON_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-toolbar-hover-background disabled:opacity-40 disabled:hover:bg-transparent';

const INPUT_CLASS =
  'w-40 bg-transparent px-2 py-0.5 text-sm text-input-foreground outline-none placeholder:text-input-placeholder-foreground';

/**
 * Floating find & replace widget, styled after VS Code's native find widget.
 * Opened via Ctrl+F (handled in the FindProvider), expandable to a replace row.
 */
export default function FindWidget() {
  const { t } = useLocalization();
  const find = useFind();

  const [expanded, setExpanded] = useState(false);
  const [replaceValue, setReplaceValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const open = find?.open ?? false;
  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
  }, [open]);

  if (!find || !find.open) {
    return null;
  }

  const hasMatches = find.matches.length > 0;
  const counter = hasMatches
    ? `${find.currentIndex + 1} ${t('webview.find.of')} ${find.matches.length}`
    : find.query
      ? t('webview.find.noResults')
      : '';

  return (
    <div
      className="fixed top-0 right-5 z-50 flex items-start gap-1 rounded-b-sm border border-t-0 border-editor-widget-border bg-editor-widget-background p-1 text-editor-widget-foreground shadow-md shadow-widget-shadow"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          find.closeWidget();
        }
      }}
    >
      <button
        type="button"
        title={t('webview.find.toggleReplace')}
        className="flex h-full min-h-6 w-4 items-center justify-center rounded-sm hover:bg-toolbar-hover-background"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className={`codicon codicon-chevron-${expanded ? 'down' : 'right'}`} />
      </button>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div
            className={`flex items-center rounded-sm border bg-input-background ${
              find.invalidQuery ? 'border-input-validation-error-border' : 'border-transparent'
            }`}
          >
            <input
              ref={searchInputRef}
              type="text"
              value={find.query}
              placeholder={t('webview.find.searchPlaceholder')}
              className={INPUT_CLASS}
              onChange={(event) => find.setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  find.goToMatch(event.shiftKey ? -1 : 1);
                }
              }}
            />
            {FLAG_TOGGLES.map(({ flag, icon, labelKey }) => (
              <button
                key={flag}
                type="button"
                title={t(labelKey)}
                aria-pressed={find.flags[flag]}
                className={`mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${
                  find.flags[flag]
                    ? 'border-input-option-active-border bg-input-option-active-background text-input-option-active-foreground'
                    : 'border-transparent hover:bg-input-option-hover-background'
                }`}
                onClick={() => find.toggleFlag(flag)}
              >
                <span className={`codicon codicon-${icon}`} />
              </button>
            ))}
          </div>

          <span className="min-w-16 text-xs text-foreground-description">{counter}</span>

          <button
            type="button"
            title={t('webview.find.previousMatch')}
            disabled={!hasMatches}
            className={ICON_BUTTON_CLASS}
            onClick={() => find.goToMatch(-1)}
          >
            <span className="codicon codicon-arrow-up" />
          </button>
          <button
            type="button"
            title={t('webview.find.nextMatch')}
            disabled={!hasMatches}
            className={ICON_BUTTON_CLASS}
            onClick={() => find.goToMatch(1)}
          >
            <span className="codicon codicon-arrow-down" />
          </button>
          <button
            type="button"
            title={t('webview.find.close')}
            className={ICON_BUTTON_CLASS}
            onClick={() => find.closeWidget()}
          >
            <span className="codicon codicon-close" />
          </button>
        </div>

        {expanded && (
          <div className="flex items-center gap-1">
            <div className="flex items-center rounded-sm border border-transparent bg-input-background">
              <input
                type="text"
                value={replaceValue}
                placeholder={t('webview.find.replacePlaceholder')}
                className={INPUT_CLASS}
                onChange={(event) => setReplaceValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    find.replaceCurrent(replaceValue);
                  }
                }}
              />
            </div>
            <button
              type="button"
              title={t('webview.find.replace')}
              disabled={!hasMatches}
              className={ICON_BUTTON_CLASS}
              onClick={() => find.replaceCurrent(replaceValue)}
            >
              <span className="codicon codicon-replace" />
            </button>
            <button
              type="button"
              title={t('webview.find.replaceAll')}
              disabled={!hasMatches}
              className={ICON_BUTTON_CLASS}
              onClick={() => find.replaceAll(replaceValue)}
            >
              <span className="codicon codicon-replace-all" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
