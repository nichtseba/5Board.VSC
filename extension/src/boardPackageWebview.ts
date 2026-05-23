import * as crypto from 'crypto';
import * as path from 'path';
import * as vscode from 'vscode';
import { FiveBoardzAsset, FiveBoardzDocument, isJsonObject } from '5board.vsc-common';
import type { FiveBoardDocument } from './boardDocument';

export const SAVE_OLD_5BOARD_AS_5BOARDZ_MESSAGE = 'saveLegacyAsPackage';

interface FiveBoardzAssetWebviewRef {
  path: string;
  mime: string;
  uri: string;
}

export function get5boardzAssetCacheRoot(
  context: vscode.ExtensionContext,
  packageUri: vscode.Uri,
): vscode.Uri {
  // ZIP assets are mirrored into globalStorage so the webview gets safe VS Code URIs.
  const hash = crypto.createHash('sha256').update(packageUri.toString()).digest('hex').slice(0, 24);
  return vscode.Uri.joinPath(context.globalStorageUri, '5boardz-assets', hash);
}

export async function render5boardzPackageHtml(
  webview: vscode.Webview,
  document: FiveBoardDocument,
  assetCacheRoot: vscode.Uri,
): Promise<string> {
  try {
    const assets = await extractAssetsForWebview(
      webview,
      assetCacheRoot,
      document.fiveBoardz.assets,
    );
    const nonce = createNonce();

    return render5boardzSummary(webview, document, assets, nonce);
  } catch (error) {
    return renderErrorHtml(webview, 'Konte 5boardz Datei nicht öffnen', errorMessage(error));
  }
}

async function extractAssetsForWebview(
  webview: vscode.Webview,
  cacheRoot: vscode.Uri,
  assets: FiveBoardzAsset[],
): Promise<FiveBoardzAssetWebviewRef[]> {
  await vscode.workspace.fs.createDirectory(cacheRoot);

  const refs = await Promise.all(
    assets.map(async (asset) => {
      const assetUri = vscode.Uri.joinPath(cacheRoot, ...asset.path.split('/'));
      await createParentDirectory(assetUri);
      await vscode.workspace.fs.writeFile(assetUri, asset.bytes);

      return {
        path: asset.path,
        mime: asset.mime,
        uri: webview.asWebviewUri(assetUri).toString(),
      };
    }),
  );

  return refs.sort((left, right) => left.path.localeCompare(right.path));
}

function render5boardzSummary(
  webview: vscode.Webview,
  document: FiveBoardDocument,
  assets: FiveBoardzAssetWebviewRef[],
  nonce: string,
): string {
  const { fiveBoardz } = document;
  const contentObjectCount =
    isJsonObject(fiveBoardz.content) && Array.isArray(fiveBoardz.content.objects)
      ? fiveBoardz.content.objects.length
      : 0;
  const csp = contentSecurityPolicy(webview, nonce);

  return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(fiveBoardz.manifest.title)}</title>
    <style>
      body { font-family: var(--vscode-font-family); padding: 24px; color: var(--vscode-foreground); }
      h1 { margin: 0 0 16px; font-size: 24px; }
      h2 { margin-top: 28px; font-size: 16px; }
      code, pre { font-family: var(--vscode-editor-font-family); }
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; max-width: 900px; }
      .tile { border: 1px solid var(--vscode-panel-border); padding: 12px; border-radius: 4px; }
      .tile strong { display: block; font-size: 20px; margin-bottom: 4px; }
      ul { padding-left: 20px; }
      button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 0; border-radius: 4px; padding: 8px 12px; cursor: pointer; }
      .legacy { border: 1px solid var(--vscode-panel-border); border-left: 4px solid var(--vscode-button-background); padding: 12px; margin: 0 0 20px; max-width: 900px; }
      .legacy p { margin: 0 0 12px; }
      img { max-width: 180px; max-height: 120px; object-fit: contain; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); }
      .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
      .asset { display: grid; gap: 8px; align-content: start; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(fiveBoardz.manifest.title)}</h1>
    ${renderOld5boardNotice(document)}
    <section class="summary">
      <div class="tile"><strong>${contentObjectCount}</strong>Canvas-Objekte</div>
      <div class="tile"><strong>${fiveBoardz.sources.length}</strong>Quelldateien</div>
      <div class="tile"><strong>${assets.length}</strong>Assets</div>
      <div class="tile">
        <strong id="counter-value">–</strong>Counter
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button id="counter-dec">−</button>
          <button id="counter-inc">+</button>
        </div>
      </div>
    </section>
    <p>Ausgewähltes Element: <span id="selected-element">–</span></p> // Move to Sidebar
    <h2>Quellcode</h2>
    ${renderSourceFiles(fiveBoardz.sources)}
    <h2>Assets</h2>
    ${renderAssets(assets)}
    ${renderScript(document, nonce)}
  </body>
</html>`;
}

function renderOld5boardNotice(document: FiveBoardDocument): string {
  if (document.source !== 'legacy') {
    return '';
  }

  // The save button appears only when it is an old .5board document.
  return `<section class="legacy">
      <p>Dies ist eine alte .5board-Datei, sie kann direkt als konvertiertes .5boardz Paket gespeichert werden.</p>
      <button id="save-legacy-as-package">Als .5boardz speichern</button>
    </section>`;
}

function renderScript(document: FiveBoardDocument, nonce: string): string {
  const legacySaveHandler =
    document.source === 'legacy'
      ? `document.getElementById('save-legacy-as-package').addEventListener('click', () => {
        vscode.postMessage({ type: '${SAVE_OLD_5BOARD_AS_5BOARDZ_MESSAGE}' });
      });`
      : '';

  return `<script nonce="${nonce}">
    (function () {
      const vscode = acquireVsCodeApi();

      window.addEventListener('message', (e) => {
        const msg = e.data;
        if (msg.type === 'init' || msg.type === 'updateContent') {
          document.getElementById('counter-value').textContent = String(msg.state.counter);
          document.getElementById('selected-element').textContent =
            msg.state.selectedElementId ?? '–';
        }
      });

      document.getElementById('counter-inc').addEventListener('click', () => {
        vscode.postMessage({ type: 'counterIncrement' });
      });
      document.getElementById('counter-dec').addEventListener('click', () => {
        vscode.postMessage({ type: 'counterDecrement' });
      });

      ${legacySaveHandler}

      vscode.postMessage({ type: 'ready' });
    }());
  </script>`;
}

function renderSourceFiles(sources: FiveBoardzDocument['sources']): string {
  if (sources.length === 0) {
    return '<p>Keine Quelldateien im Paket.</p>';
  }

  const items = sources
    .map((source) => {
      return `<li><code>${escapeHtml(source.path)}</code> (${escapeHtml(source.language)}: ${escapeHtml(source.name)})</li>`;
    })
    .join('');

  return `<ul>${items}</ul>`;
}

function renderAssets(assets: FiveBoardzAssetWebviewRef[]): string {
  if (assets.length === 0) {
    return '<p>Keine Assets im Paket.</p>';
  }

  return `<div class="asset-grid">${assets
    .map((asset) => {
      const preview = asset.mime.startsWith('image/')
        ? `<img src="${asset.uri}" alt="${escapeHtml(asset.path)}" />`
        : '<span>Binary asset</span>';

      return `<div class="asset">${preview}<code>${escapeHtml(asset.path)}</code></div>`;
    })
    .join('')}</div>`;
}

function renderErrorHtml(webview: vscode.Webview, title: string, message: string): string {
  const nonce = createNonce();
  const csp = contentSecurityPolicy(webview, nonce);

  return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>body { font-family: var(--vscode-font-family); padding: 24px; color: var(--vscode-foreground); }</style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <pre>${escapeHtml(message)}</pre>
  </body>
</html>`;
}

async function createParentDirectory(uri: vscode.Uri): Promise<void> {
  const parent = vscode.Uri.file(path.dirname(uri.fsPath));
  await vscode.workspace.fs.createDirectory(parent);
}

function contentSecurityPolicy(webview: vscode.Webview, nonce: string): string {
  // Restrictive CSP: only webview resources, images, and nonce scripts are allowed.
  return [
    "default-src 'none'",
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src ${webview.cspSource} 'nonce-${nonce}'`,
  ].join('; ');
}

function createNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
