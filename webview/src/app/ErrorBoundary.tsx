import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

function formatError(error: unknown) {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      fallbackRender={({ error }) => (
        <main
          className="flex min-h-screen flex-col gap-2 overflow-auto bg-editor-background p-4 text-foreground"
          role="alert"
        >
          <h1 className="text-lg font-semibold text-foreground-error">Webview error</h1>
          <pre className="whitespace-pre-wrap wrap-break-word font-mono text-sm">
            {formatError(error)}
          </pre>
        </main>
      )}
      // eslint-disable-next-line no-console
      onError={(error, errorInfo) => console.error('Unhandled webview error', error, errorInfo)}
    >
      {children}
    </ReactErrorBoundary>
  );
}
