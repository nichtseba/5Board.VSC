import { EditorElement, EditorElementType } from '5board.vsc-common';
import SettingsPanel from '../layout/SettingsPanel';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { Button, Dropdown } from 'vscrui';
import SettingsField from '../layout/SettingsField';
import { useMessageService } from '../../../services/MessageService';
import {
  BoldIcon,
  CodeBracketIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Bars3BottomRightIcon,
  Bars4Icon,
} from '@heroicons/react/24/outline';

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
              appearance={element.data.tiptap?.marks?.bold ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleBold' } })
              }
            >
              <BoldIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.tiptap?.marks?.italic ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleItalic' } })
              }
            >
              <ItalicIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.tiptap?.marks?.strike ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleStrike' } })
              }
            >
              <StrikethroughIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.tiptap?.marks?.underline ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleUnderline' } })
              }
            >
              <UnderlineIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={element.data.tiptap?.marks?.code ? 'primary' : 'secondary'}
              onClick={() =>
                messages.send({ type: 'textEditorCommand', command: { type: 'toggleCode' } })
              }
            >
              <CodeBracketIcon className="size-5" />
            </Button>
          </div>
        </SettingsField>
        <hr className="border-editor-sticky-scroll-shadow" />
        <SettingsField>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-3 mt-4">
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={
                element.data.tiptap?.nodes?.attributes?.textAlign === 'left'
                  ? 'primary'
                  : 'secondary'
              }
              onClick={() =>
                messages.send({
                  type: 'textEditorCommand',
                  command: { type: 'setTextAlign', value: 'left' },
                })
              }
            >
              <Bars3BottomLeftIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={
                element.data.tiptap?.nodes?.attributes?.textAlign === 'center'
                  ? 'primary'
                  : 'secondary'
              }
              onClick={() =>
                messages.send({
                  type: 'textEditorCommand',
                  command: { type: 'setTextAlign', value: 'center' },
                })
              }
            >
              <Bars3Icon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={
                element.data.tiptap?.nodes?.attributes?.textAlign === 'right'
                  ? 'primary'
                  : 'secondary'
              }
              onClick={() =>
                messages.send({
                  type: 'textEditorCommand',
                  command: { type: 'setTextAlign', value: 'right' },
                })
              }
            >
              <Bars3BottomRightIcon className="size-5" />
            </Button>
            <Button
              className="h-8 flex flex-col items-center justify-center gap-2"
              appearance={
                element.data.tiptap?.nodes?.attributes?.textAlign === 'justify'
                  ? 'primary'
                  : 'secondary'
              }
              onClick={() =>
                messages.send({
                  type: 'textEditorCommand',
                  command: { type: 'setTextAlign', value: 'justify' },
                })
              }
            >
              <Bars4Icon className="size-5" />
            </Button>
          </div>
        </SettingsField>
      </SettingsPanel>
    </>
  );
}
