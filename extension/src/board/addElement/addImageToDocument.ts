import { BoardDocument, EditorElementType } from '5board.vsc-common';
import path from 'path';

/*
 * Adds an image asset to the document and creates a matching image element for it
 */
export function addImageToDocument(
  document: BoardDocument,
  requestedName: string,
  bytes: Uint8Array,
): void {
  const assetName = addImageAsset(document, requestedName, bytes);

  document.content.elements.push({
    id: assetName,
    type: EditorElementType.Image,
    layout: {
      xPos: 0,
      yPos: 0,
      width: 32,
      height: 18,
    },
    style: {
      visible: true,
    },
    display: {
      visible: true,
      excludeFromExport: false,
      speakerNote: false,
    },
    data: {
      src: assetName,
      content: '',
      title: assetName,
      altText: assetName,
      configuredWidth: false,
    },
  });
}

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
