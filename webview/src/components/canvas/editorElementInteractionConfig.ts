import { EditorElementType } from '5board.vsc-common';

export const elementInteractionConfig = {
  [EditorElementType.Heading]: {
    draggable: true,
    resizable: false,

    lockX: true,
  },
};
