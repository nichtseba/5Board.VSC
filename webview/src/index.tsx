import { createRoot } from 'react-dom/client';
import Webview from './Webview';

function start() {
  const root = createRoot(document.getElementById('root')!);
  root.render(<Webview></Webview>);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
