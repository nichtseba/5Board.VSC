import { EditorElementType } from '5board.vsc-common';

export type ElementInteractionProfile = {
  draggable: boolean;
  dragDirection: 'free' | 'vertical' | 'horizontal';
  resizable: boolean;
  rotatable: boolean;
  scalable?: boolean; // TODO for future use
  clipable?: boolean; // TODO for future use
};

export const ELEMENT_INTERACTION_CONFIG = {
  [EditorElementType.Heading]: {
    draggable: true,
    dragDirection: 'vertical',
    resizable: false,
    rotatable: false,
  },
  [EditorElementType.Text]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: false,
  },
} satisfies Record<EditorElementType, ElementInteractionProfile>;
