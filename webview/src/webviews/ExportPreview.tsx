import { useEffect } from 'react';
import { init } from '../app/init';
import { useMessageService } from '../services/MessageService';
import EditorCanvas from '../components/canvas/EditorCanvas';
import { useLocalization } from '../providers/LocalizationProvider';
import type { MessageService } from '../services/MessageService';
import { createExportCanvasHtml } from '../exportUtils';
import { Button } from 'vscrui';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { CanvasEventsProvider } from '../providers/CanvasEventsProvider';

export default function ExportPreview() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const document = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', gap: 8, padding: 8 }}>
      <Button appearance="primary" onClick={() => void exportDocument(messages)}>
        {t('webview.exportPreview.saveHtml')}
      </Button>

      {document ? (
        <div style={{ pointerEvents: 'none' }}>
          <CanvasEventsProvider>
            <EditorCanvas />
          </CanvasEventsProvider>
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
  });
}

init(ExportPreview);
