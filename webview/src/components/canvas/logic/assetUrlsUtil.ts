import { Asset } from '5board.vsc-common';

// Converts asset bytes to Base64 data URLs so image elements can render embedded assets
export function createAssetUrls(assets: Asset[]): Record<string, string> {
  return Object.fromEntries(
    assets.map((asset) => {
      const bytes = toUint8Array(asset.bytes);
      let binary = '';
      const chunkSize = 0x8000;

      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }

      return [asset.name, `data:;base64,${btoa(binary)}`];
    }),
  );
}

// Normalizes asset bytes after they crossed the extension/webview message boundary
function toUint8Array(bytes: unknown): Uint8Array {
  if (typeof bytes === 'object' && bytes !== null && 'data' in bytes) {
    const data = (bytes as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return new Uint8Array(data);
    }
  }

  return new Uint8Array(Object.values(bytes as Record<string, number>));
}
