import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  SUPPORTED_LANGUAGES,
  getLanguageSupport,
  sanitizeClassName,
  type CodeClass,
} from '5board.vsc-common';
import { Button, Dropdown, TextField, type DropdownOption } from 'vscrui';
import { init } from '../app/init';
import { SidebarShell } from '../components/sidebar/layout/SidebarShell';
import SettingsPanel from '../components/sidebar/layout/SettingsPanel';
import { useBoardDocument } from '../providers/BoardDocumentProvider';
import { useLocalization } from '../providers/LocalizationProvider';
import { useMessageService } from '../services/MessageService';

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

function languageOptions(): DropdownOption[] {
  return SUPPORTED_LANGUAGES.map((support) => ({
    value: support.id,
    label: support.displayName,
  }));
}

function optionValue(value: string | DropdownOption | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.value;
}

function ClassRow({ codeClass }: { codeClass: CodeClass }) {
  const messages = useMessageService();
  const { t } = useLocalization();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(codeClass.name);
  const [draftLanguage, setDraftLanguage] = useState(codeClass.language);

  const startEdit = () => {
    setDraftName(codeClass.name);
    setDraftLanguage(codeClass.language);
    setEditing(true);
  };

  const commitEdit = () => {
    const newName = draftName.trim();
    const renamed = !!newName && newName !== codeClass.name;
    if (renamed) {
      messages.send({
        type: 'manageCodeClass',
        op: 'rename',
        name: codeClass.name,
        language: codeClass.language,
        newName,
      });
    }
    if (draftLanguage !== codeClass.language) {
      // Runs after the rename; the class is then addressed by its sanitized new name.
      // Each operation guards target availability independently, so a rejected rename
      // simply turns the language change into a no-op.
      messages.send({
        type: 'manageCodeClass',
        op: 'changeLanguage',
        name: renamed ? sanitizeClassName(newName) : codeClass.name,
        language: codeClass.language,
        newLanguage: draftLanguage,
      });
    }
    setEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') commitEdit();
    if (event.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-0.5">
        <TextField value={draftName} onChange={setDraftName} onKeyDown={handleKeyDown} />
        <Dropdown
          options={languageOptions()}
          value={draftLanguage}
          onChange={(value) => {
            const selected = optionValue(value);
            if (selected) setDraftLanguage(selected);
          }}
        />
        <div className="flex items-center gap-2">
          <Button onClick={commitEdit}>{t('webview.sidebar-class-settings.apply')}</Button>
          <Button appearance="secondary" onClick={() => setEditing(false)}>
            {t('webview.sidebar-class-settings.cancel')}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-0.5">
      <span className="codicon codicon-symbol-class text-symbolIcon-classForeground" />
      <span>{codeClass.name}</span>
      <span className="text-foreground-description">
        {getLanguageSupport(codeClass.language)?.displayName ?? codeClass.language}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          title={t('webview.sidebar-class-settings.edit')}
          onClick={startEdit}
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
      <Dropdown
        options={languageOptions()}
        value={language}
        onChange={(value) => {
          const selected = optionValue(value);
          if (selected) setLanguage(selected);
        }}
      />
      <Button onClick={commitCreate}>{t('webview.sidebar-class-settings.create')}</Button>
    </div>
  );
}

init(ClassSettingsSidebar);
