import { useEffect, useState } from 'react';
import { init } from '../app/init';
import { useMessageService, useOnMessage } from '../services/MessageService';

type PreviewState = {
  html: string;
  fileName: string;
  warnings: string[];
};

// Shows generated HTML in an iframe with refresh and save controls.
export default function ExportPreview() {
  const messages = useMessageService();
  const [preview, setPreview] = useState<PreviewState>({
    html: '',
    fileName: '',
    warnings: [],
  });

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, [messages]);

  useOnMessage((msg) => {
    if (msg.type === 'htmlExportPreviewLoaded') {
      setPreview({
        html: msg.html,
        fileName: msg.fileName,
        warnings: msg.warnings,
      });
    }

    if (msg.type === 'error') {
      setPreview((current) => ({
        ...current,
        warnings: [msg.message],
      }));
    }
  });

  return (
    <div
      className="flex h-screen flex-col text-editor-foreground"
      style={{ background: 'var(--vscode-editor-background)' }}
    >
      <header
        className="flex h-10 shrink-0 items-center gap-2 border-b px-3"
        style={{ borderColor: 'var(--vscode-panel-border)' }}
      >
        <strong className="truncate text-sm font-semibold">
          {preview.fileName ? preview.fileName : 'HTML Export Preview'}
        </strong>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-sm disabled:opacity-50"
            title="Refresh preview"
            type="button"
            onClick={() => messages.send({ type: 'refreshHtmlExportPreview' })}
          >
            <span className="codicon codicon-refresh" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-sm disabled:opacity-50"
            disabled={!preview.html}
            title="Save HTML export"
            type="button"
            onClick={() => messages.send({ type: 'saveHtmlExport' })}
          >
            <span className="codicon codicon-save" />
          </button>
        </div>
      </header>

      {preview.warnings.length > 0 && (
        <section
          className="max-h-28 shrink-0 overflow-auto border-b px-3 py-2 text-xs"
          style={{
            borderColor: 'var(--vscode-panel-border)',
            background: 'var(--vscode-editorWidget-background)',
          }}
        >
          {preview.warnings.map((warning, index) => (
            <div key={`${warning}-${index}`}>{warning}</div>
          ))}
        </section>
      )}

      {preview.html ? (
        <iframe
          className="min-h-0 flex-1 bg-white"
          sandbox=""
          srcDoc={preview.html}
          title="HTML export preview"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-foreground-description">
          No preview loaded.
        </div>
      )}
    </div>
  );
}

init(ExportPreview);
