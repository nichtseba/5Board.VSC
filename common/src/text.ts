export type TextEditorCommand =
  | { type: 'toggleBold' }
  | { type: 'toggleItalic' }
  | { type: 'toggleStrike' }
  | { type: 'toggleUnderline' }
  | { type: 'toggleCode' }
  | { type: 'setTextAlign'; value: 'left' | 'center' | 'right' | 'justify' }
  | { type: 'setFontFamily'; font: string }
  | { type: 'setFontSize'; size: string }
  | { type: 'setLineHeight'; height: string }
  | { type: 'setTextColor'; color: string }
  | { type: 'setBackgroundColor'; color: string }
  | { type: 'focus' };
