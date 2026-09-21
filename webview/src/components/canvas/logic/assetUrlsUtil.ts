import { Asset } from '5board.vsc-common';

// Creates temporary blob URLs for assets so image elements can render images from assets folder
export function createAssetUrls(assets: Asset[]): Record<string, string> {
  return Object.fromEntries(
    assets.map((asset) => {
      const bytes = toUint8Array(asset.bytes);
      const blob = new Blob([
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      ]);
      const url = URL.createObjectURL(blob);

      return [asset.name, url];
    }),
  );
}

// Releases previously created blob URLs to avoid keeping unused asset data in memory
export function revokeAssetUrls(assetUrls: Record<string, string>): void {
  Object.values(assetUrls).forEach((url) => URL.revokeObjectURL(url));
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
