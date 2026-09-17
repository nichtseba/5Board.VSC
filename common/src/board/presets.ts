import { EditorElement } from './element';

export type Preset = {
  id: string;
  name: string;
  settings: PresetSettings;
  element: EditorElement;
  asset?: number[]; // Optional asset data for image presets
};
export type PresetSettings = {
  keepStyle: boolean;
  keepXPosition: boolean;
  keepContent: boolean;
};
