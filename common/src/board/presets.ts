import { EditorElement } from './element';

export type Preset = {
  id: string;
  name: string;
  settings: PresetSettings;
  element: EditorElement;
};
export type PresetSettings = {
  keepStyle: boolean;
  keepXPosition: boolean;
  keepContent: boolean;
};
