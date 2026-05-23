// Todo: Add additional element types
export enum EditorElementType {
  Heading = 'heading',
}
// Todo: Message Beispiel zb -> hier nicht neue Dateien ^^
// common nur generelle
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

// Todo: Figure out proper document type
export type Document = {
  content: {
    elements: EditorElement[];
  };
};
