import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';

export function CodeElement({ element }: EditorElementProps<EditorElementType.Code>) {
  const { fileName, language, content, output } = element.data;

  return (
    <div className="code-element flex h-full min-h-[100px] flex-col overflow-hidden rounded border border-[var(--vscode-editorWidget-border)] bg-[var(--vscode-editorWidget-background)] p-3 text-sm">
      {fileName ? <div className="mb-2 font-semibold">{fileName}</div> : null}
      <div className="mb-2 text-xs uppercase tracking-wide text-[var(--vscode-descriptionForeground)]">
        {language ?? 'Code'}
      </div>
      <pre className="m-0 overflow-auto whitespace-pre-wrap break-words font-mono">{content}</pre>
      {output ? (
        <div className="mt-3 rounded bg-[var(--vscode-input-background)] p-2 text-xs text-[var(--vscode-descriptionForeground)]">
          <strong>Output:</strong>
          <pre className="m-0 whitespace-pre-wrap font-mono">{output}</pre>
        </div>
      ) : null}
    </div>
  );
}
