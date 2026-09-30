import { EditorElementType } from '5board.vsc-common';

export type ElementInteractionProfile = {
  draggable: boolean;
  dragDirection: 'free' | 'vertical' | 'horizontal';
  resizable: boolean;
  rotatable: boolean;
  scalable?: boolean; // TODO for future use
  keepRatio?: boolean;
  clipable?: boolean; // TODO for future use
  /** Double-click enters editing mode. */
  editable?: boolean;
  /** Only the element's content takes clicks; empty space inside it passes them through. */
  clickThroughEmptyArea?: boolean;
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
    editable: true,
  },
  [EditorElementType.Code]: {
    draggable: true,
    dragDirection: 'vertical',
    resizable: true,
    rotatable: false,
    editable: true,
    clickThroughEmptyArea: true,
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
  [EditorElementType.TableOfContents]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: false,
  },
  [EditorElementType.Freehand]: {
    draggable: true,
    dragDirection: 'free',
    resizable: true,
    rotatable: false,
  },
} satisfies Record<EditorElementType, ElementInteractionProfile>;
