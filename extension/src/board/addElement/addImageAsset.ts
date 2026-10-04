import { BoardDocument } from '5board.vsc-common';
import path from 'path';

/*
 * Saves image file in board assets and returns its unique asset name
 */
export function addImageAsset(
  document: BoardDocument,
  requestedName: string,
  bytes: Uint8Array,
): string {
  const assetName = createUniqueAssetName(document, requestedName);

  document.assets.push({
    name: assetName,
    bytes,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  });

  return assetName;
}

/*
 * Creates a unique asset name by appending a counter if the requested name already exists
 */
function createUniqueAssetName(document: BoardDocument, requestedName: string): string {
  let assetName = requestedName;

  if (document.assets.some((asset) => asset.name === assetName)) {
    const nameWithoutExt = assetName.replace(path.extname(assetName), '');
    const ext = path.extname(assetName);
    let counter = 1;

    while (document.assets.some((asset) => asset.name === assetName)) {
      assetName = `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }
  }
  return assetName;
}
