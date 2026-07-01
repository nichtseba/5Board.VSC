export type BoardElement = EditorElement; // Todo: Replace with new Element type when we have it defined
// Todo: Add additional element types
export enum EditorElementType {
  Heading = 'heading',
  Text = 'text',
  Code = 'code',
  Image = 'image',
  Shape = 'shape',
  Arrow = 'arrow',
}

/**
 * Editor Element Base Types
 */
export type EditorElement<T extends EditorElementType = EditorElementType> = {
  id: string;
  type: T;

  layout: ElementLayout;
  style: ElementStyle;

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

export type EditorElementDataMap = {
  [EditorElementType.Heading]: HeadingElementData;
  [EditorElementType.Text]: TextElementData;
  [EditorElementType.Code]: CodeElementData;
  [EditorElementType.Image]: ImageElementData;
  [EditorElementType.Shape]: ShapeElementData;
  [EditorElementType.Arrow]: ArrowElementData;
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

export type CodeElementData = {
  codeBlockId: string;
  fileName?: string;
  language?: string;

  content: string;
  output?: string;
};

export type ImageElementData = {
  src: string;
  content: string;

  title?: string;
  altText?: string;

  hideInExport?: boolean;

  cropData?: CropData;
};
export type CropData = {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
};

export type ArrowElementData = {
  headTypeStart?: 'none' | 'arrow' | 'circle' | 'square';
  headTypeEnd?: 'none' | 'arrow' | 'circle' | 'square';
  headSize?: number;
  headFill?: boolean;
  points: { x: number; y: number }[]; // Start and end points for the arrow
};

export type ShapeElementData =
  | RectangleShapeData
  | EllipseShapeData
  | LineShapeData
  | PolygonShapeData;

type Point = { x: number; y: number };

type BaseShapeData = {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shapeType: 'rectangle' | 'ellipse' | 'line' | 'polygon';
};

type RectangleShapeData = BaseShapeData & {
  shapeType: 'rectangle';
  radius?: number;
};

type EllipseShapeData = BaseShapeData & {
  shapeType: 'ellipse';
  rx: number;
  ry: number;
};

type LineShapeData = BaseShapeData & {
  shapeType: 'line';
  points: [Point, Point];
};

type PolygonShapeData = BaseShapeData & {
  shapeType: 'polygon';
  points: Point[];
};

/**
 * All Editor Element Defaults when creating a new element
 */
export const DEFAULT_ELEMENT_PROFILES = {
  [EditorElementType.Heading]: {
    layout: { width: 40, height: 2 },
    data: { level: 1, content: 'Heading' },
  },
  [EditorElementType.Text]: {
    layout: { width: 20, height: 10 },
    data: { content: 'Text' },
  },
  [EditorElementType.Code]: {
    layout: { width: 40, height: 10 },
    data: { codeBlockId: '', content: '', language: 'plaintext' },
  },
  [EditorElementType.Image]: {
    layout: { width: 20, height: 10 },
    data: { src: '', content: '', altText: 'Image' },
  },
  [EditorElementType.Shape]: {
    layout: { width: 8, height: 6 },
    data: { shapeType: 'rectangle' },
  },
  [EditorElementType.Arrow]: {
    layout: { width: 12, height: 4 },
    data: {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    },
  },
} satisfies {
  [K in EditorElementType]: {
    layout: Omit<ElementLayout, 'xPos' | 'yPos'>;
    data: EditorElementDataMap[K];
  };
};
