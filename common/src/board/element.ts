export type BoardElement = EditorElement; // Todo: Replace with new Element type when we have it defined
// Todo: Add additional element types
export enum EditorElementType {
  Heading = 'heading',
  Text = 'text',
}

/**
 * Editor Element Base Types
 */
export type EditorElement<T extends EditorElementType = EditorElementType> = {
  id: string;
  type: T;

  layout: ElementLayout;
  style?: ElementStyle;

  data: EditorElementDataMap[T];
};

export type ElementLayout = {
  yPos: number;
  xPos: number;

  height: number;
  width: number;

  rotation?: number;
  //z-index?: number;
};

export type ElementStyle = {
  color?: string;
  backgroundColor?: string;

  visible: boolean;
  opacity?: number;

  border?: {
    color?: string;
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
    radius?: number;
  };
};

/**
 * All Editor Element Data Types
 */

type EditorElementDataMap = {
  [EditorElementType.Heading]: HeadingElementData;
  [EditorElementType.Text]: TextElementData;
};

export type HeadingElementData = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
  textStyle?: TextStyle;
};

export type TextElementData = {
  content: string;
  textStyle?: TextStyle;
};

export type TextStyle = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textDecoration?: TextDecorationStyle;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
};
export type TextDecorationStyle = {
  underline?: boolean;
  overline?: boolean;
  lineThrough?: boolean;
};
