import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from 'vscrui';
import { useMessageService, useOnMessage } from '../../../services/MessageService';
import { useGrid } from '../../../providers/GridProvider';

/**
 * Renders a text element.
 */
export function TextElement({ element }: EditorElementProps<EditorElementType.Text>) {
  const messages = useMessageService();
  const grid = useGrid();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, //heading has it's own ElementType
      }),
      TextAlign.configure({
        types: ['paragraph'],
        defaultAlignment: 'left',
      }),
    ],
    content: element.data.content,

    onTransaction({ editor }) {
      const textAlign = editor.isActive({ textAlign: 'left' })
        ? 'left'
        : editor.isActive({ textAlign: 'center' })
          ? 'center'
          : editor.isActive({ textAlign: 'right' })
            ? 'right'
            : editor.isActive({ textAlign: 'justify' })
              ? 'justify'
              : undefined;

      //calculate if element height should grow
      const requiredRows = Math.ceil(editor.view.dom.offsetHeight / grid.cellSize.height);
      let elementHeight = element.layout.height;
      if (requiredRows > elementHeight) {
        elementHeight = requiredRows;
      }

      messages.send({
        type: 'updateElement',
        id: element.id,
        changes: {
          layout: {
            height: elementHeight,
            width: element.layout.width,
            yPos: element.layout.yPos,
            xPos: element.layout.xPos,
          },
          data: {
            content: editor.getJSON(),
            tiptap: {
              marks: {
                bold: editor.isActive('bold'),
                code: editor.isActive('code'),
                italic: editor.isActive('italic'),
                link: editor.isActive('link'),
                strike: editor.isActive('strike'),
                underline: editor.isActive('underline'),
              },
              nodes: {
                attributes: {
                  textAlign,
                },
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

      case 'toggleCode':
        editor.chain().focus().toggleCode().run();
        break;

      case 'setTextAlign':
        editor.chain().focus().setTextAlign(msg.command.value).run();
        break;
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
        <Button
          className="h-8 flex flex-col items-center justify-center gap-2"
          appearance={editor.isActive('code') ? 'primary' : 'secondary'}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <span className={'codicon codicon-code'} />
        </Button>
      </BubbleMenu>
    </>
  );
}
