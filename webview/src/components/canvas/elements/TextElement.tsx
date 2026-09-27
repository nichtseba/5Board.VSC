import { useEffect, useRef } from 'react';
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
  const applyingExternalContent = useRef(false);

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
      if (applyingExternalContent.current) return;

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
                textStyle: {
                  fontFamily: editor.getAttributes('textStyle').fontFamily ?? undefined,
                  fontSize: editor.getAttributes('textStyle').fontSize ?? undefined,
                  lineHeight: editor.getAttributes('textStyle').lineHeight ?? undefined,
                  color: editor.getAttributes('textStyle').color ?? undefined,
                  backgroundColor: editor.getAttributes('textStyle').backgroundColor ?? undefined,
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
      });
    },
  });

  useEffect(() => {
    if (!editor || editing) return;

    const incomingContent = element.data.content;
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(incomingContent)) return;

    applyingExternalContent.current = true;
    try {
      editor.commands.setContent(incomingContent, { emitUpdate: false });
    } finally {
      applyingExternalContent.current = false;
    }
  }, [editor, element.data.content]);

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
        if (msg.command.font === 'default') {
          editor.chain().focus().unsetFontFamily().run();
        } else {
          editor.chain().focus().setFontFamily(msg.command.font).run();
        }
        break;

      case 'setFontSize':
        editor
          .chain()
          .setFontSize(msg.command.size + 'px')
          .run();
        break;

      case 'setLineHeight':
        editor.chain().focus().setLineHeight(msg.command.height).run();
        break;

      case 'setTextColor':
        editor.chain().focus().setColor(msg.command.color).run();

        break;

      case 'setBackgroundColor':
        if (msg.command.color === undefined) {
          editor.chain().focus().unsetBackgroundColor().run();
        } else {
          editor.chain().focus().setBackgroundColor(msg.command.color).run();
        }
        break;

      case 'toggleBulletList':
        editor.chain().focus().toggleBulletList().run();
        break;

      case 'toggleOrderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;

      case 'focus':
        editor.chain().focus().run();
    }
  });

  return (
    <div
      style={{ width: '100%', height: '100%', backgroundColor: element.style.backgroundColor }}
      className="flex flex-col"
    >
      <EditorContent editor={editor} />
      {editing && (
        <BubbleMenu editor={editor}>
          <BoldButton element={element} />
          <ItalicButton element={element} />
          <StrikeButton element={element} />
          <UnderlineButton element={element} />
          <CodeButton element={element} />
        </BubbleMenu>
      )}
    </div>
  );
}
