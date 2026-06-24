import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Button, Dropdown } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import { useMessageService } from '../../../services/MessageService';

type Props = {
  element: EditorElement<EditorElementType.Text>;
};
export function TextSettings({ element }: Props) {
  const { t } = useLocalization();
  const messages = useMessageService();
  return (
    <>
      <SettingsPanel
        title={t('webview.sidebar-element-settings.textSettings.title')}
        icon="symbol-string"
      >
        <SettingsField>
          <Dropdown
            options={[
              { value: 'Arial', label: 'Arial' },
              { value: 'Schriftart2', label: 'Schriftart2' },
              { value: 'Schriftart3', label: 'Schriftart3' },
            ]}
            value="Arial"
          />
          <Dropdown
            options={[
              { value: '9', label: '9' },
              { value: '10', label: '10' },
              { value: '11', label: '11' },
              { value: '12', label: '12' },
              { value: '14', label: '14' },
              { value: '16', label: '16' },
              { value: '20', label: '20' },
            ]}
            value="11"
          />
          <Dropdown
            options={[
              { value: 'schwarz', label: 'schwarz' },
              { value: 'rot', label: 'rot' },
              { value: 'gelb', label: 'gelb' },
              { value: 'grün', label: 'grün' },
              { value: 'blau', label: 'blau' },
              { value: 'orange', label: 'orange' },
              { value: 'lila', label: 'lila' },
            ]}
            value="schwarz"
          />
        </SettingsField>
        <hr className="border-editor-sticky-scroll-shadow" />
        <SettingsField>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3 mt-4">
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.marks?.bold ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleBold' } })
              }
            >
              <span className={`codicon codicon-bold`} />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.marks?.italic ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleItalic' } })
              }
            >
              <span className={`codicon codicon-italic`} />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.marks?.strike ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleStrike' } })
              }
            >
              <span className={`codicon codicon-strikethrough`} />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.marks?.underline ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleUnderline' } })
              }
            >
              <span className={'underline'}>U</span>
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.marks?.code ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleCode' } })
              }
            >
              <span className={'codicon codicon-code'} />
            </Button>
          </div>
        </SettingsField>
        <hr className="border-editor-sticky-scroll-shadow" />
        <SettingsField>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3 mt-4">
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.textAlign === 'left' ? 'primary' : 'secondary'}
            >
              <span className={`codicon codicon-list-flat`} />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.textAlign === 'center' ? 'primary' : 'secondary'}
            >
              <span className={`codicon codicon-list-flat`} />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.textAlign === 'right' ? 'primary' : 'secondary'}
            >
              <span className={`codicon codicon-list-flat`} />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.textStyle?.textAlign === 'justify' ? 'primary' : 'secondary'}
            >
              <span className={'codicon codicon-list-flat'} />
            </Button>
          </div>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
