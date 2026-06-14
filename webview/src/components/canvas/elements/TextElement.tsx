import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu, BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';

/**
 * Renders a text element.
 */
export function TextElement({ element }: EditorElementProps<EditorElementType.Text>) {
  const Tiptap = () => {
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
        <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
        <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
      </>
    );
  };
  return <Tiptap />;
}
