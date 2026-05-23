import { useVsCode } from './VsCode';

export default function EditorElement() {
  const vscode = useVsCode();
  return <div>{JSON.stringify(Object.keys(vscode))}</div>;
}
