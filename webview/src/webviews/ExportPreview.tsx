import { useEffect, useState } from 'react';
import { init } from '../app/init';
import { useMessageService, useOnMessage } from '../services/MessageService';
import { BoardDocument } from '5board.vsc-common';
import EditorCanvas from '../components/canvas/EditorCanvas';
import { useLocalization } from '../providers/LocalizationProvider';
import type { MessageService } from '../services/MessageService';
import { createExportCanvasHtml } from '../exportUtils';

export default function ExportPreview() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [document, setDocument] = useState<BoardDocument | null>(null);

  useOnMessage((msg) => {
    if (msg.type === 'updateDocument' || msg.type === 'init') {
      setDocument(msg.document);
    }
  });

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', gap: 8, padding: 8 }}>
      <button type="button" onClick={() => void exportDocument(messages)}>
        {t('webview.exportPreview.saveHtml')}
      </button>

      {document ? (
        <div>
          <EditorCanvas document={document} />
        </div>
      ) : (
        <p>{t('webview.exportPreview.loading')}</p>
      )}
    </div>
  );
}

// Sends the prepared export canvas HTML to the extension for saving
async function exportDocument(messages: MessageService): Promise<void> {
  const exportCanvasHtml = await createExportCanvasHtml();

  if (!exportCanvasHtml) {
    return;
  }

  messages.send({
    type: 'saveHtmlExport',
    html: exportCanvasHtml.html,
    backgroundColor: exportCanvasHtml.backgroundColor,
    fileName: '5board-export',
  });
}

init(ExportPreview);
