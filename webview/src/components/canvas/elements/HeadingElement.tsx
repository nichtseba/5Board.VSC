import {
  EditorElementType,
  TextDecorationStyle,
  WebviewToExtensionMessage,
  getHeadingLevelSettings,
} from '5board.vsc-common';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { EditorElementProps } from '../EditorElement';
import { useHeadingNumber } from '../../../providers/HeadingNumberingContext';
import { vscodeApi } from '../../VsCode';
import { useBoardDocument } from '../../../providers/BoardDocumentProvider';

/**
 * Renders a heading element. The heading level (h1, h2, etc.) is determined by the `level` property in the element's data.
 * A hierarchical index (e.g. "1.", "1.1") derived from the heading's position is prefixed to the content.
 *
 * Double-clicking the heading enters inline edit mode for the text content. The change is committed
 * on blur or Enter and discarded on Escape. The derived index prefix is never editable.
 */
export function HeadingElement({ element }: EditorElementProps<EditorElementType.Heading>) {
  const number = useHeadingNumber(element.id);
  const boardDocument = useBoardDocument();
  const levelSettings = getHeadingLevelSettings(
    boardDocument?.content.headingSettings,
    element.data.level,
  );
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLSpanElement>(null);
  const headingStyle: React.CSSProperties = {
    color: levelSettings.color,
    backgroundColor: levelSettings.backgroundColor,
    fontFamily: levelSettings.fontFamily,
    fontSize: levelSettings.fontSize ? `${levelSettings.fontSize}px` : undefined,
    fontWeight: levelSettings.fontWeight,
    fontStyle: levelSettings.fontStyle,
    textDecoration: formatTextDecoration(levelSettings.textDecoration),
  };

  // When entering edit mode, focus the content span and place the caret at the end
  // so the user can type immediately.
  useEffect(() => {
    if (!isEditing || !contentRef.current) return;
    const span = contentRef.current;
    span.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(span);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [isEditing]);

  function commit(): void {
    setIsEditing(false);
    const newContent = contentRef.current?.textContent ?? '';
    if (newContent !== element.data.content) {
      const message: WebviewToExtensionMessage<'updateElements'> = {
        type: 'updateElements',
        changes: [
          {
            id: element.id,
            changes: { data: { ...element.data, content: newContent } },
          },
        ],
      };
      vscodeApi.postMessage(message);
    }
  }

  function cancel(): void {
    if (contentRef.current) {
      contentRef.current.textContent = element.data.content;
    }
    setIsEditing(false);
  }

  /** Utility component for rendering the appropriate heading tag based on the level */
  function HeadingTag({
    children,
    level,
    style,
  }: {
    children: React.ReactNode;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    style: React.CSSProperties;
  }) {
    switch (level) {
      case 1:
        return (
          <h1 className="leading-tight" style={style}>
            {children}
          </h1>
        );
      case 2:
        return (
          <h2 className="leading-tight" style={style}>
            {children}
          </h2>
        );
      case 3:
        return (
          <h3 className="leading-snug" style={style}>
            {children}
          </h3>
        );
      case 4:
        return (
          <h4 className="leading-snug" style={style}>
            {children}
          </h4>
        );
      case 5:
        return (
          <h5 className="leading-normal" style={style}>
            {children}
          </h5>
        );
      case 6:
        return (
          <h6 className="leading-normal" style={style}>
            {children}
          </h6>
        );
      default:
        throw new Error(`Invalid heading level: ${level}`);
    }
  }

  return (
    <HeadingTag level={element.data.level} style={headingStyle}>
      {number ? <span className="heading-index">{number} </span> : null}
      <span
        ref={contentRef}
        className="outline-none"
        contentEditable={isEditing}
        suppressContentEditableWarning
        onDoubleClick={() => setIsEditing(true)}
        onClick={(e) => {
          if (isEditing) e.stopPropagation();
        }}
        onBlur={() => {
          if (isEditing) commit();
        }}
        onKeyDown={(e) => {
          if (!isEditing) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
      >
        {element.data.content}
      </span>
    </HeadingTag>
  );
}

function formatTextDecoration(textDecoration: TextDecorationStyle | undefined): string | undefined {
  const decorations: string[] = [];

  if (textDecoration?.underline) {
    decorations.push('underline');
  }
  if (textDecoration?.overline) {
    decorations.push('overline');
  }
  if (textDecoration?.lineThrough) {
    decorations.push('line-through');
  }

  return decorations.length > 0 ? decorations.join(' ') : undefined;
}
