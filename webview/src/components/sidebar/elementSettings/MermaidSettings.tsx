import { useState } from 'react';
import { EditorElement, EditorElementType } from '5board.vsc-common';
import { Button, Divider, TextArea } from 'vscrui';
import SettingsPanel from '../layout/SettingsPanel';
import SettingsField from '../layout/SettingsField';
import { useLocalization } from '../../../providers/LocalizationProvider';
import { useMessageService } from '../../../services/MessageService';
import GenericElementSettings from './GenericElementSettings';
import { TransformationSettings } from './TransformationSettings';

type Props = {
  elements: EditorElement<EditorElementType.Mermaid>[];
};

export function MermaidSettings({ elements }: Props) {
  if (elements.length !== 1) return null;
  return <SingleMermaidSettings element={elements[0]} />;
}

function SingleMermaidSettings({ element }: { element: EditorElement<EditorElementType.Mermaid> }) {
  const { t } = useLocalization();
  const messages = useMessageService();

  const [source, setSource] = useState(element.data.source);

  const applyChanges = () => {
    messages.send({
      type: 'updateElements',
      changes: [
        {
          id: element.id,
          changes: {
            data: {
              source,
            },
          },
        },
      ],
    });
  };

  return (
    <SettingsPanel
      title={t('webview.sidebar-element-settings.mermaidSettings.title')}
      icon="workflow"
    >
      <GenericElementSettings element={element} />
      <Divider />
      <TransformationSettings elements={[element]} />
      <Divider />
      <SettingsField label={t('webview.sidebar-element-settings.mermaidSettings.source')}>
        <TextArea
          value={source}
          onChange={setSource}
          placeholder="flowchart TD\n  A[Start] --> B[Ende]"
          resize="vertical"
          className="w-full"
        />
      </SettingsField>
      <Button appearance="primary" disabled={source === element.data.source} onClick={applyChanges}>
        {t('webview.sidebar-element-settings.mermaidSettings.apply')}
      </Button>
    </SettingsPanel>
  );
}
