import { EditorElementType } from '5board.vsc-common';
import { ELEMENT_INTERACTION_CONFIG, ElementInteractionProfile } from './InteractionConfig';

/**
 * Applies the configured drag direction to a translation.
 *
 * vertical   -> x is ignored
 * horizontal -> y is ignored
 * free       -> both axes are allowed
 */
export const constrainTranslation = (
  elementType: EditorElementType,
  x: number,
  y: number,
): [number, number] => {
  const profile: ElementInteractionProfile = ELEMENT_INTERACTION_CONFIG[elementType];

  switch (profile.dragDirection) {
    case 'vertical':
      return [0, y];

    case 'horizontal':
      return [x, 0];

    case 'free':
      return [x, y];
  }
};

/** * Converts a pixel translation into a grid translation. */
export const snapTranslationToGrid = (
  x: number,
  y: number,
  cellSize: { width: number; height: number },
): [number, number] => {
  return [Math.round(x / cellSize.width), Math.round(y / cellSize.height)];
};
