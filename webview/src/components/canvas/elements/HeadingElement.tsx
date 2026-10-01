import { EditorElementType, TextDecorationStyle, getHeadingLevelSettings } from '5board.vsc-common';
import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { EditorElementProps } from '../EditorElement';
import { useHeadingNumber } from '../../../providers/HeadingNumberingContext';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';
import { useGrid } from '../../../providers/GridProvider';
import { useIsEditorView } from '../../../providers/ViewTypeProvider';
import { useMessageService } from '../../../services/MessageService';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

/**
 * Uses the shared element edit mode while keeping the derived number read-only.
 * Enter/blur commit the plain text draft; Escape discards it.
 */
export function HeadingElement({
  element,
  editing = false,
  editingPosition,
  onStopEditing,
  preview,
}: EditorElementProps<EditorElementType.Heading>) {
  const number = useHeadingNumber(element.id);
  const boardDocument = useBoardDocument();
  const messages = useMessageService();
  const isEditorView = useIsEditorView();
  const { cellSize, metrics } = useGrid();
  const levelSettings = getHeadingLevelSettings(
    boardDocument?.content.headingSettings,
    element.data.level,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const editSession = useRef<{
    original: string;
    draft: string;
    node: HTMLSpanElement;
  } | null>(null);
  const pendingHeight = useRef<number | null>(null);
  const HeadingTag = HEADING_TAGS[element.data.level - 1];
  const headingStyle: React.CSSProperties = {
    color: levelSettings.color,
    backgroundColor: levelSettings.backgroundColor,
    fontFamily: levelSettings.fontFamily,
    fontSize: levelSettings.fontSize ? `${levelSettings.fontSize}px` : undefined,
    fontWeight: levelSettings.fontWeight,
    fontStyle: levelSettings.fontStyle,
    textDecoration: formatTextDecoration(levelSettings.textDecoration),
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    margin: 0,
  };

  const commit = useCallback(() => {
    const session = editSession.current;
    if (!session) return;
    // Clear synchronously: blur and deselection can both end the same edit.
    editSession.current = null;
    if (contentRef.current) contentRef.current.textContent = session.draft;
    if (session.draft !== element.data.content) {
      messages.send({
        type: 'updateElements',
        changes: [
          {
            id: element.id,
            changes: { data: { ...element.data, content: session.draft } },
          },
        ],
      });
    }
    onStopEditing?.();
  }, [element.id, element.data, messages, onStopEditing]);

  function cancel(): void {
    const session = editSession.current;
    if (!session) return;
    editSession.current = null;
    if (contentRef.current) contentRef.current.textContent = session.original;
    onStopEditing?.();
  }

  // The browser owns the editable children. Restore external content only when
  // it changes, and preserve the draft if a different heading tag is mounted.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const session = editSession.current;
    if (!content || session?.node === content) return;
    content.textContent = session ? editableContent(session.draft) : element.data.content;
    if (session) session.node = content;
  }, [element.data.content, element.data.level]);

  useLayoutEffect(() => {
    if (!editing) {
      commit();
    } else if (!editSession.current && contentRef.current) {
      editSession.current = {
        original: element.data.content,
        draft: element.data.content,
        node: contentRef.current,
      };
      contentRef.current.textContent = editableContent(element.data.content);
    }
  }, [editing, element.data.content, commit]);

  useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      const content = contentRef.current;
      if (!content || !editSession.current) return;
      content.focus();
      const clickedContent =
        editingPosition &&
        Array.from(content.getClientRects()).some(
          (rect) =>
            editingPosition.x >= rect.left &&
            editingPosition.x < rect.right &&
            editingPosition.y >= rect.top &&
            editingPosition.y < rect.bottom,
        );
      const range = clickedContent
        ? document.caretRangeFromPoint(editingPosition.x, editingPosition.y)
        : null;
      const selection = window.getSelection();
      if (!selection) return;
      const caret =
        range && content.contains(range.startContainer) ? range : document.createRange();
      if (caret !== range) {
        // The editable DOM may include a trailing caret placeholder. The
        // fallback belongs at the end of the draft, before that placeholder.
        caret.setStart(content.firstChild ?? content, editSession.current.draft.length);
        caret.collapse(true);
      } else if (caret.startContainer === content.firstChild) {
        caret.setStart(
          caret.startContainer,
          Math.min(caret.startOffset, editSession.current.draft.length),
        );
        caret.collapse(true);
      }
      selection.removeAllRanges();
      selection.addRange(caret);
    });
    return () => cancelAnimationFrame(frame);
  }, [editing, editingPosition, element.data.level]);

  useEffect(() => {
    if (pendingHeight.current !== null && element.layout.height >= pendingHeight.current) {
      pendingHeight.current = null;
    }
  }, [element.layout.height]);

  useEffect(() => {
    const heading = headingRef.current;
    // GridProvider starts with placeholder cell sizes until the canvas mounts.
    if (!heading || !isEditorView || preview || metrics.width <= 0 || cellSize.height <= 0) return;
    let frame: number | null = null;
    const scheduleMeasurement = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const requiredRows = Math.ceil(
          Math.max(heading.offsetHeight, heading.scrollHeight) / cellSize.height,
        );
        if (requiredRows <= Math.max(element.layout.height, pendingHeight.current ?? 0)) return;
        pendingHeight.current = requiredRows;
        messages.send({
          type: 'updateElementsLayout',
          changes: [{ id: element.id, changes: { height: requiredRows } }],
        });
      });
    };
    const observer = new ResizeObserver(scheduleMeasurement);
    observer.observe(heading);
    scheduleMeasurement();
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [
    isEditorView,
    preview,
    metrics.width,
    cellSize.height,
    element.id,
    element.data.level,
    element.layout.height,
    messages,
  ]);

  return (
    <HeadingTag
      ref={headingRef}
      className={
        element.data.level <= 2
          ? 'leading-tight'
          : element.data.level <= 4
            ? 'leading-snug'
            : 'leading-normal'
      }
      style={headingStyle}
    >
      {number ? <span className="heading-index">{number} </span> : null}
      <span
        ref={contentRef}
        className="outline-none"
        style={{ userSelect: editing ? 'text' : undefined }}
        contentEditable={editing ? 'plaintext-only' : false}
        suppressContentEditableWarning
        onInput={(event) => {
          if (editSession.current) {
            // Chromium keeps a terminal newline as a caret placeholder in this
            // plain-text editing host. It is not part of the saved content.
            editSession.current.draft = event.currentTarget.innerText
              .replace(/\r\n?/g, '\n')
              .replace(/\n$/, '');
          }
        }}
        onClick={(event) => {
          if (editing) event.stopPropagation();
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (!editing) return;
          const key = event.key.toLowerCase();
          const isClipboardShortcut =
            (event.metaKey || event.ctrlKey) && (key === 'c' || key === 'v');
          if (!isClipboardShortcut) event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
      />
    </HeadingTag>
  );
}

function editableContent(content: string): string {
  return content.endsWith('\n') ? `${content}\n` : content;
}

function formatTextDecoration(textDecoration: TextDecorationStyle | undefined): string | undefined {
  const decorations: string[] = [];
  if (textDecoration?.underline) decorations.push('underline');
  if (textDecoration?.overline) decorations.push('overline');
  if (textDecoration?.lineThrough) decorations.push('line-through');
  return decorations.length > 0 ? decorations.join(' ') : undefined;
}
