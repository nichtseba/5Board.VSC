import { EditorElementType } from '5board.vsc-common';
import { EditorElementProps } from '../EditorElement';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { useMessageService, useOnMessage } from '../../../services/MessageService';
import { useGrid } from '../../../providers/GridProvider';
import {
  BoldButton,
  CodeButton,
  ItalicButton,
  StrikeButton,
  UnderlineButton,
} from '../../sidebar/elementSettings/components/TextSettingsButton';

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
      TextStyleKit,
    ],
    content: element.data.content,

    editorProps: {
      attributes: {
        class: 'outline-none focus:outline-none',
      },
    },

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
                textStyle: { fontFamily: editor.getAttributes('textStyle').fontFamily },
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

      case 'setFontFamily':
        editor.chain().focus().setFontFamily(msg.command.font).run();
        break;
    }
  });

  return (
    <>
      <EditorContent editor={editor} />
      <BubbleMenu editor={editor}>
        <BoldButton element={element} />
        <ItalicButton element={element} />
        <StrikeButton element={element} />
        <UnderlineButton element={element} />
        <CodeButton element={element} />
      </BubbleMenu>
    </>
  );
}
