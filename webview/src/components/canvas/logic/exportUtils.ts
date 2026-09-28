// Creates HTML copy of the rendered canvas for export incl. backgroundcolor
export async function createExportCanvasHtml(): Promise<{
  html: string;
  backgroundColor: string;
} | null> {
  const canvas = window.document.getElementById('html-export-canvas');

  if (!(canvas instanceof HTMLElement)) {
    return null;
  }

  const exportCanvas = canvas.cloneNode(true) as HTMLElement;
  copyComputedStyles(canvas, exportCanvas);

  const computedStyle = window.getComputedStyle(canvas);
  exportCanvas.style.backgroundColor = computedStyle.backgroundColor;

  return {
    html: exportCanvas.outerHTML,
    backgroundColor: computedStyle.backgroundColor,
  };
}

// Copies css styles from the rendered preview DOM to the cloned export DOM
function copyComputedStyles(source: Element, target: Element): void {
  if (source instanceof HTMLElement && target instanceof HTMLElement) {
    const computedStyle = window.getComputedStyle(source);

    for (const property of computedStyle) {
      target.style.setProperty(
        property,
        computedStyle.getPropertyValue(property),
        computedStyle.getPropertyPriority(property),
      );
    }
  }

  [...source.children].forEach((sourceChild, index) => {
    const targetChild = target.children[index];

    if (targetChild) {
      copyComputedStyles(sourceChild, targetChild);
    }
  });
}
