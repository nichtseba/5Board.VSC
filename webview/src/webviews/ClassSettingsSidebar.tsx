import { useEffect, useState, type KeyboardEvent } from 'react';
import { SUPPORTED_LANGUAGES, type CodeClass } from '5board.vsc-common';
import { Button, Dropdown, TextField } from 'vscrui';
import { init } from '../app/init';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import SettingsPanel from '../components/sidebar/layout/SettingsPanel';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { useLocalization } from '../providers/LocalizationProvider';
import { useMessageService } from '../services/MessageService';

// Manages the document's named code classes; assigning blocks happens in CodeSettings.
export default function ClassSettingsSidebar() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const document = useBoardDocument();

  useEffect(() => {
    messages.send({ type: 'ready' });
  }, []);

  const classes = document?.content.codeClasses ?? [];

  return (
    <SidebarShell>
      <SettingsPanel title={t('webview.sidebar-class-settings.title')} icon="symbol-class">
        {classes.length === 0 ? (
          <p className="text-foreground-description">
            {t('webview.sidebar-class-settings.noClasses')}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {classes.map((codeClass) => (
              <ClassRow key={`${codeClass.language}/${codeClass.name}`} codeClass={codeClass} />
            ))}
          </ul>
        )}
        <CreateClassRow />
      </SettingsPanel>
    </SidebarShell>
  );
}

function ClassRow({ codeClass }: { codeClass: CodeClass }) {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [draft, setDraft] = useState<string | null>(null);

  const commitRename = () => {
    if (draft && draft.trim() && draft !== codeClass.name) {
      messages.send({
        type: 'manageCodeClass',
        op: 'rename',
        name: codeClass.name,
        language: codeClass.language,
        newName: draft,
      });
    }
    setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') commitRename();
    if (event.key === 'Escape') setDraft(null);
  };

  if (draft !== null) {
    return (
      <li className="flex items-center gap-2">
        <TextField value={draft} onChange={setDraft} onKeyDown={handleKeyDown} />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-0.5">
      <span className="codicon codicon-symbol-class text-symbolIcon-classForeground" />
      <span>{codeClass.name}</span>
      <div className="ml-auto flex items-center gap-1">
        <button
          title={t('webview.sidebar-class-settings.rename')}
          onClick={() => setDraft(codeClass.name)}
          className="flex items-center px-1 py-1 bg-transparent border-none cursor-pointer rounded-xs hover:bg-list-hover-background"
        >
          <span className="codicon codicon-edit" />
        </button>
        <button
          title={t('webview.sidebar-class-settings.delete')}
          onClick={() =>
            messages.send({
              type: 'manageCodeClass',
              op: 'delete',
              name: codeClass.name,
              language: codeClass.language,
            })
          }
          className="flex items-center px-1 py-1 bg-transparent border-none cursor-pointer rounded-xs hover:bg-list-hover-background"
        >
          <span className="codicon codicon-trash" />
        </button>
      </div>
    </li>
  );
}

function CreateClassRow() {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState(SUPPORTED_LANGUAGES[0].id);

  const commitCreate = () => {
    if (!name.trim()) return;
    messages.send({ type: 'manageCodeClass', op: 'create', name, language });
    setName('');
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <TextField
        value={name}
        placeholder={t('webview.sidebar-class-settings.newClassPlaceholder')}
        onChange={setName}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (event.key === 'Enter') commitCreate();
        }}
      />
      {SUPPORTED_LANGUAGES.length > 1 && (
        <Dropdown
          options={SUPPORTED_LANGUAGES.map((support) => ({
            value: support.id,
            label: support.displayName,
          }))}
          value={language}
          onChange={(value) => {
            if (typeof value === 'string') setLanguage(value);
            else if (value) setLanguage(value.value);
          }}
        />
      )}
      <Button onClick={commitCreate}>{t('webview.sidebar-class-settings.create')}</Button>
    </div>
  );
}

init(ClassSettingsSidebar);
