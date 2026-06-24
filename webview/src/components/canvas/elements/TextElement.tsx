import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Button } from 'vscrui';
import { useMessageService, useOnMessage } from '../../../services/MessageService';

/**
 * Renders a text element.
 */
export function TextElement({ element }: EditorElementProps<EditorElementType.Text>) {
  const messages = useMessageService();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, //heading has it's own ElementType
      }),
    ],
    content: element.data.content,

    onTransaction({ editor }) {
      messages.send({
        type: 'updateElement',
        id: element.id,
        changes: {
          data: {
            content: editor.getJSON(),
            textStyle: {
              textDecoration: {
                underline: editor.isActive('underline'),
                lineThrough: editor.isActive('strike'),
              },
            },
          },
        },
      });
    },
  });

  useOnMessage((msg) => {
    if (msg.type !== 'textEditorCommand') {
      return;
    }

    if (!editor) {
      return;
    }

    switch (msg.command.type) {
      case 'toggleBold':
        editor.chain().focus().toggleBold().run();
        break;

      case 'toggleItalic':
        editor.chain().focus().toggleItalic().run();
        break;

      case 'toggleStrike':
        editor.chain().focus().toggleStrike().run();
        break;

      case 'toggleUnderline':
        editor.chain().focus().toggleUnderline().run();
        break;

      // case 'setTextAlign':
      //   editor.commands.toggleTextAlign(msg.command.value);
      //   break;
    }
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
