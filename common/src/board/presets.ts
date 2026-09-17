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
  bytes?: number[];
};
export type PresetSettings = {
  keepStyle: boolean;
  keepXPosition: boolean;
  keepContent: boolean;
};
