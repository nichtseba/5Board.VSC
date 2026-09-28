import {
  AddElementDefaults,
  BoardDocument,
  DEFAULT_ELEMENT_PROFILES,
  EditorElement,
  EditorElementDataMap,
  EditorElementType,
  ElementLayout,
  ImageElementData,
} from '5board.vsc-common';
import { addImageAsset } from './addImageAsset';

export function createDefaultElement<T extends EditorElementType>(
  type: T,
  position: ElementLayout,
  defaults: AddElementDefaults<T> | undefined,
  document: BoardDocument,
): EditorElement<T> {
  const profile = DEFAULT_ELEMENT_PROFILES[type];
  const data = {
    ...structuredClone(profile.data),
    ...defaults?.data,
  } as EditorElementDataMap[T];

  if (type === EditorElementType.Image && defaults?.asset) {
    const assetName = addImageAsset(
      document,
      defaults.asset.name,
      new Uint8Array(defaults.asset.bytes),
    );
    const imageData = data as ImageElementData;
    Object.assign(imageData, {
      src: assetName,
      title: imageData.title ?? assetName,
      altText: imageData.altText ?? assetName,
      configuredWidth: false,
    });
  }

  return {
    id: crypto.randomUUID(),
    type,
    layout: {
      ...profile.layout,
      ...position,
      width: defaults?.layout?.width ?? profile.layout.width,
      height: defaults?.layout?.height ?? profile.layout.height,
    },

    style: {
      ...structuredClone(profile.style),
      ...defaults?.style,
    },
    data,
  };
}
