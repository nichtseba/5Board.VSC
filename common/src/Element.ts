export enum EditorElementType {
  Heading = 'heading',
}

export type EditorElement<T extends EditorElementType = EditorElementType> = {
  id: string;
  type: T;
  yPos: number;
  data: EditorElementDataMap[T];
};

type EditorElementDataMap = {
  [EditorElementType.Heading]: HeadingElementData;
};

export type HeadingElementData = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
};

export type Document = {
  content: {
    elements: EditorElement[];
  };
};
