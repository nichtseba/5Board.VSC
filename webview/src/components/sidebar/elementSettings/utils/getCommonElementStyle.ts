import { EditorElement, EditorElementType, ElementStyle } from '5board.vsc-common';
import { getCommonValue } from './getCommonValue';

export function getCommonElementStyle(elements: EditorElement<EditorElementType>[]): ElementStyle {
  return {
    color: getCommonValue(elements.map((element) => element.style.color)),

    backgroundColor: getCommonValue(elements.map((element) => element.style.backgroundColor)),

    visible: getCommonValue(elements.map((element) => element.style.visible)) ?? true,

    opacity: getCommonValue(elements.map((element) => element.style.opacity)),

    border: {
      color: getCommonValue(elements.map((element) => element.style.border?.color)),

      width: getCommonValue(elements.map((element) => element.style.border?.width)),

      style: getCommonValue(elements.map((element) => element.style.border?.style)),

      radius: getCommonValue(elements.map((element) => element.style.border?.radius)),
    },
  };
}
