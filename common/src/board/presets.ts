import { EditorElement } from './element';

export type Preset = {
  id: string;
  name: string;
  settings: PresetSettings;
  element: EditorElement;
  asset?: PresetAsset;
};
export type PresetAsset = {
  fileName: string;
  bytes?: Uint8Array;
};
export type PresetSettings = {
  keepStyle: boolean;
  keepXPosition: boolean;
  keepContent: boolean;
};
