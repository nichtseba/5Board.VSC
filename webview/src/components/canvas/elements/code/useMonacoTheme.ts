import { useEffect, useState } from 'react';

function getMonacoTheme(): string {
  const kind = document.body.getAttribute('data-vscode-theme-kind');
  if (kind === 'vscode-light') return 'vs';
  if (kind === 'vscode-high-contrast') return 'hc-black';
  return 'vs-dark';
}

/** Tracks the active VS Code theme kind and maps it to the matching Monaco theme. */
export function useMonacoTheme(): string {
  const [monacoTheme, setMonacoTheme] = useState(getMonacoTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setMonacoTheme(getMonacoTheme()));
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-vscode-theme-kind'],
    });
    return () => observer.disconnect();
  }, []);

  return monacoTheme;
}
