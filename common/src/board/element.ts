export type BoardElement = EditorElement; // Todo: Replace with new Element type when we have it defined
// Todo: Add additional element types
export enum EditorElementType {
  Heading = 'heading',
}

export type EditorElement<T extends EditorElementType = EditorElementType> = {
  id: string;
  type: T;
  yPos: number;
  height: number;
  data: EditorElementDataMap[T];
};

type EditorElementDataMap = {
  [EditorElementType.Heading]: HeadingElementData;
};

export type HeadingElementData = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
};
