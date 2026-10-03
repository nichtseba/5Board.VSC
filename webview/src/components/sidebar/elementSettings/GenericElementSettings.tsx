import { EditorElement, ElementDisplay } from '5board.vsc-common';
import SettingsField from '../layout/SettingsField';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Button, TextField } from 'vscrui';
import { useMessageService } from '../../../services/MessageService';
import { useCallback } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleBottomCenterTextIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
export default function GenericElementSettings({ element }: { element: EditorElement }) {
  const { t } = useLocalization();
  const messages = useMessageService();
  const updateElementDisplay = useCallback(
    (changes: Partial<ElementDisplay>) => {
      messages.send({
        type: 'updateElements',
        changes: [
          {
            id: element.id,
            changes: { display: { ...element.display, ...changes } },
          },
        ],
      });
    },
    [element.id, element.display, messages],
  );
  const updateElementName = useCallback(
    (name: string) => {
      messages.send({
        type: 'updateElements',
        changes: [{ id: element.id, changes: { name } }],
      });
    },
    [element.id, messages],
  );
  return (
    <>
      <SettingsField label={t('webview.sidebar-element-settings.name')}>
        <TextField value={element.name ?? ''} onChange={(value) => updateElementName(value)} />
      </SettingsField>

      <SettingsField label={t('webview.sidebar-element-settings.visibility')}>
        <div className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3">
          <Button
            className="h-8 flex flex-col items-center justify-center gap-2"
            appearance={!element.display.visible ? 'primary' : 'secondary'}
            title={t('webview.sidebar-element-settings.hide')}
            aria-label={t('webview.sidebar-element-settings.hide')}
            aria-pressed={!element.display.visible}
            onClick={() => updateElementDisplay({ visible: !element.display.visible })}
          >
            <EyeSlashIcon className="size-5" />
          </Button>
          <Button
            className="h-8 flex flex-col items-center justify-center gap-2"
            appearance={element.display.speakerNote ? 'primary' : 'secondary'}
            title={t('webview.sidebar-element-settings.speakerNote')}
            aria-label={t('webview.sidebar-element-settings.speakerNote')}
            aria-pressed={element.display.speakerNote}
            onClick={() => updateElementDisplay({ speakerNote: !element.display.speakerNote })}
          >
            <ChatBubbleBottomCenterTextIcon className="size-5" />
          </Button>
          <Button
            className="h-8 flex flex-col items-center justify-center gap-2"
            appearance={element.display.excludeFromExport ? 'primary' : 'secondary'}
            title={t('webview.sidebar-element-settings.hideInExport')}
            aria-label={t('webview.sidebar-element-settings.hideInExport')}
            aria-pressed={element.display.excludeFromExport}
            onClick={() =>
              updateElementDisplay({ excludeFromExport: !element.display.excludeFromExport })
            }
          >
            <ArrowTopRightOnSquareIcon className="size-5" />
          </Button>
        </div>
      </SettingsField>
    </>
  );
}
