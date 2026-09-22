import { useEffect } from 'react';
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
export function TextElement({
  element,
  editing = false,
  editingPosition,
  onStopEditing,
}: EditorElementProps<EditorElementType.Text>) {
  const messages = useMessageService();
  const grid = useGrid();

  const editor = useEditor({
    editable: editing,

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
        class: 'outline-none focus:outline-none tiptap',
      },
      handleDOMEvents: {
        keydown: (_view, event) => {
          if (event.key === 'Escape' && editing) {
            event.preventDefault();
            onStopEditing?.();
            return true;
          }

          event.stopPropagation();
          return false;
        },
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
        type: 'updateElements',
        changes: [
          {
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
                    textStyle: {
                      fontFamily: editor.getAttributes('textStyle').fontFamily,
                      fontSize: editor.getAttributes('textStyle').fontSize,
                      lineHeight: editor.getAttributes('textStyle').lineHeight,
                      color: editor.getAttributes('textStyle').color,
                      backgroundColor: editor.getAttributes('textStyle').backgroundColor,
                    },
                  },
                  nodes: {
                    bulletList: editor.isActive('bulletList'),
                    orderedList: editor.isActive('orderedList'),
                    attributes: {
                      textAlign,
                    },
                  },
                },
              },
            },
          },
        ],
      });
    },
  });
  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editing);

    if (!editing || !editingPosition) {
      return;
    }

    requestAnimationFrame(() => {
      const position = editor.view.posAtCoords({
        left: editingPosition.x,
        top: editingPosition.y,
      });
      if (!position) {
        editor.commands.focus();
        return;
      }

      editor.commands.setTextSelection(position.pos);
      editor.commands.focus();
    });
  }, [editor, editing, editingPosition]);

  useOnMessage((msg) => {
    if (msg.type !== 'textEditorCommand') {
      return;
    }

    if (!editor) {
      return;
    }

    if (!msg.ids.includes(element.id)) {
      return;
    }

    const chain = editor.chain();

    if (editing) {
      chain.focus();
    } else {
      chain.selectAll();
    }

    switch (msg.command.type) {
      case 'toggleBold':
        chain.toggleBold().run();
        break;

      case 'toggleItalic':
        chain.toggleItalic().run();
        break;

      case 'toggleStrike':
        chain.toggleStrike().run();
        break;

      case 'toggleUnderline':
        chain.toggleUnderline().run();
        break;

      case 'toggleCode':
        chain.toggleCode().run();
        break;

      case 'setTextAlign':
        chain.setTextAlign(msg.command.value).run();
        break;

      case 'setFontFamily':
        if (msg.command.font === 'default') {
          chain.unsetFontFamily().run();
        } else {
          chain.setFontFamily(msg.command.font).run();
        }
        break;

      case 'setFontSize':
        chain.setFontSize(msg.command.size + 'px').run();
        break;

      case 'setLineHeight':
        chain.setLineHeight(msg.command.height).run();
        break;

      case 'setTextColor':
        chain.setColor(msg.command.color).run();
        break;

      case 'setBackgroundColor':
        chain.setBackgroundColor(msg.command.color).run();
        break;

      case 'toggleBulletList':
        chain.toggleBulletList().run();
        break;

      case 'toggleOrderedList':
        chain.toggleOrderedList().run();
        break;

      case 'focus':
        chain.focus().run();
    }
  });

  return (
    <>
      <EditorContent editor={editor} />
      {editing && (
        <BubbleMenu editor={editor}>
          <BoldButton elements={[element]} />
          <ItalicButton elements={[element]} />
          <StrikeButton elements={[element]} />
          <UnderlineButton elements={[element]} />
          <CodeButton elements={[element]} />
        </BubbleMenu>
      )}
    </>
  );
}
