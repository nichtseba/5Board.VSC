import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Button } from 'vscrui';

/**
 * Renders a text element.
 */
export function TextElement({ element }: EditorElementProps<EditorElementType.Text>) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, //heading has it's own ElementType
      }),
    ],
    content: element.data.content,
  });

  return (
    <>
      <EditorContent editor={editor} />
      <BubbleMenu editor={editor}>
        <Button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 flex flex-col items-center justify-center gap-2"
          appearance={editor.isActive('bold') ? 'primary' : 'secondary'}
        >
          <span className={`codicon codicon-bold`} />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 flex flex-col items-center justify-center gap-2"
          appearance={editor.isActive('italic') ? 'primary' : 'secondary'}
        >
          <span className={`codicon codicon-italic`} />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className="h-8 flex flex-col items-center justify-center gap-2"
          appearance={editor.isActive('strike') ? 'primary' : 'secondary'}
        >
          <span className={`codicon codicon-strikethrough`} />
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="h-8 flex flex-col items-center justify-center gap-2"
          appearance={editor.isActive('underline') ? 'primary' : 'secondary'}
        >
          <span className={'codicon underline'}>U</span>
        </Button>
      </BubbleMenu>
    </>
  );
}
