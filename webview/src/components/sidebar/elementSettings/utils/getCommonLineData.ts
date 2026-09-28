import { EditorElement, EditorElementType, LineElementData } from '5board.vsc-common';
import { getCommonValue } from './getCommonValue';

type CommonLineData = {
  headTypeStart?: LineElementData['headTypeStart'];
  headTypeEnd?: LineElementData['headTypeEnd'];
  headSize?: LineElementData['headSize'];
  headFill?: LineElementData['headFill'];
};

export function getCommonLineData(
  elements: EditorElement<EditorElementType.Line>[],
): CommonLineData {
  return {
    headTypeStart: getCommonValue(elements.map((element) => element.data.headTypeStart)),
    headTypeEnd: getCommonValue(elements.map((element) => element.data.headTypeEnd)),
    headSize: getCommonValue(elements.map((element) => element.data.headSize)),
    headFill: getCommonValue(elements.map((element) => element.data.headFill)),
  };
}
