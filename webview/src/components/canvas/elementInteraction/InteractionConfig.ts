import { EditorElementType } from '5board.vsc-common';

export type ElementInteractionProfile = {
  draggable: boolean;
  dragDirection: 'free' | 'vertical' | 'horizontal';
  resizable: boolean;
  rotatable: boolean;
  scalable?: boolean; // TODO for future use
  keepRatio?: boolean;
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
  [EditorElementType.Code]: {
    draggable: true,
    dragDirection: 'vertical',
    resizable: false,
    rotatable: false,
  },
  [EditorElementType.Image]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: true,
    scalable: true,
    keepRatio: true,
    clipable: true,
  },
  [EditorElementType.Rectangle]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: true,
  },
  [EditorElementType.Circle]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: true,
  },
  [EditorElementType.Line]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: true,
  },
  [EditorElementType.Freehand]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: false,
  },
} satisfies Record<EditorElementType, ElementInteractionProfile>;
