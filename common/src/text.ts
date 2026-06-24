export type TextEditorCommand =
  | { type: 'toggleBold' }
  | { type: 'toggleItalic' }
  | { type: 'toggleStrike' }
  | { type: 'toggleUnderline' }
  | { type: 'setTextAlign'; value: 'left' | 'center' | 'right' | 'justify' };
