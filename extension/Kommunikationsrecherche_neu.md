# Extension ↔ Webview Kommunikation

## Das große Bild

VS Code Webviews laufen in einem Browser-Sandbox (kein direkter Zugriff auf Node.js/Dateisystem).
Die Extension läuft in Node.js. Die einzige Brücke zwischen beiden ist ein **Message-Passing System**.

Da Sidebar und Editor **zwei separate Webviews** sind, fungiert die Extension als Broker:
jede Nachricht geht immer über die Extension und wird von dort aus an alle anderen Webviews weitergeleitet.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                   VS Code Window                                   │
│                                                                                    │
│  ┌─────────────────────┐   ┌──────────────────────────────┐    ┌─────────────────┐ │
│  │   Sidebar Webview   │   │       Extension Host         │    │  Editor Webview │ │
│  │   (Browser / React) │   │       (Node.js)              │    │  (Browser/React)│ │
│  │                     │   │                              │    │                 │ │
│  │  Counter: 3   [+]   │   │   ┌────────────────────┐     │    │   Counter: 3    │ │
│  │               [−]   │   │   │   MessageService   │     │    │   [+]  [−]      │ │
│  │                     │   │   │                    │     │    │                 │ │
│  │  MessageService     │   │   │   state = {        │     │    │  MessageService │ │
│  │  .send(msg)         │   │   │     counter: 3     │     │    │  .send(msg)     │ │
│  └──────────┬──────────┘   │   │   }                │     │    └────────┬────────┘ │
│             │              │   │   webviews = [S, E]│     │             │          │
│             │postMessage() │   └─────────┬──────────┘     │             │          │
│             │              │             │                │             │          │
│             └─────────────▶│             │                │             │          │
│   { type: 'counterIncrement' }    state.counter++         │             │          │
│                            │             │                │             │          │
│             ◀──────────────┼─────────────┤ broadcast()    │             │          │
│   { type: 'updateContent', │             └──────────────▶ │             │          │
│     state: { counter: 4 }} │   { type: 'updateContent',   │ ◀───────────┘          │
│                            │     state: { counter: 4 }}   │                        │
│   setState({ counter: 4 }) │                              │setState({ counter: 4 })│
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Wichtig:** Jede Webview hat ihren eigenen `MessageService`. Beide können senden (`send`)
und empfangen (`useOnMessage`). Die Extension leitet alles weiter.

---

## Message Types (`common/src/main.ts`)

Alle Typen sind im `common` Package definiert — Extension und Webviews importieren von dort.

```ts
export type AppState = {
  counter: number;
};

// Extension → Webview
export type ExtensionToWebviewMessage =
  | { type: 'init';          state: AppState  }  // Erstnachricht beim Öffnen
  | { type: 'updateContent'; state: AppState  }  // State hat sich geändert
  | { type: 'fileLoaded';    content: string; fileName: string }  // Dateiinhalt für diesen Editor
  | { type: 'statusUpdate';  status: string   }  // z.B. "Code läuft..."
  | { type: 'error';         message: string  };

// Webview → Extension
export type WebviewToExtensionMessage =
  | { type: 'ready'                         }  // React ist gemounted, bitte init senden
  | { type: 'runCode';          code: string }  // Code ausführen lassen
  | { type: 'counterIncrement'              }
  | { type: 'counterDecrement'              };
```

Neue Nachrichten einfach als weiteres `| { type: '...' }` hinzufügen.

---

## Extension-Seite: `MessageService` (`extension/src/MessageService.ts`)

```
Aufgaben:
  1. Alle Webviews registrieren (Sidebar + alle offenen Editor-Panels)
  2. Eingehende Nachrichten verarbeiten (State updaten)
  3. Neuen State an ALLE Webviews broadcasten
```

```ts
const messages = new MessageService();

// Sidebar (nur State, keine Dateidaten):
messages.register(webviewView);

// Editor-Panel (State + Dateiinhalt):
messages.registerEditor(webviewPanel, { content, fileName });
```

`register()` macht Folgendes:
- Verdrahtet `webview.onDidReceiveMessage` → ruft `handleMessage(msg, sender)` auf
- Räumt sich beim Schließen selbst auf (`onDidDispose`) — kein `context.subscriptions.push` nötig

**Warum kein `context.subscriptions.push(register())`?**
`resolveCustomEditor` und `resolveWebviewView` werden von VS Code zu einem Zeitpunkt
aufgerufen, bei dem das interne DisposableStore in einem anderen Zustand ist.
Dort reinzupushen führt zu "Trying to add a disposable to a DisposableStore that has
already been disposed" Fehlern. Stattdessen verwaltet `register()` den Lifecycle intern.

### `ready`-Handshake — warum?

```
Webview startet          Extension wartet           Webview bereit
     │                         │                          │
     │  (HTML + JS laden)      │                          │
     │  .....................  │                          │
     │  React mount()          │                          │
     │──── { type: 'ready' } ─▶│                          │
     │                         │  handleMessage('ready')  │
     │◀─── { type: 'init',  ───┤                          │
     │      state:{counter:3}} │                          │
     │                         │                          │
  setState({ counter: 3 })     │                          │
```

Nachrichten die gesendet werden BEVOR die Webview läuft werden verworfen.
Deshalb sendet jede Webview beim Mount `{ type: 'ready' }`, woraufhin die Extension
mit dem aktuellen State antwortet. Das stellt sicher, dass ein neu geöffneter Editor
sofort den richtigen Counter-Stand bekommt.

`handleMessage()` verarbeitet eingehende Nachrichten:
```ts
case 'ready':
  sender.postMessage({ type: 'init', state: this.state });  // nur an DIESEN sender
  const data = this.editorData.get(sender);
  if (data) sender.postMessage({ type: 'fileLoaded', ...data });  // nur an DIESEN sender
  break;
case 'counterIncrement':
  this.state = { ...this.state, counter: this.state.counter + 1 };
  this.broadcast({ type: 'updateContent', state: this.state });  // an ALLE
  break;
```

---

## Webview-Seite: `MessageService` (`webview/src/services/MessageService.ts`)

```
Aufgaben:
  1. Nachrichten an die Extension senden (.send)
  2. Nachrichten von der Extension empfangen (.on / useOnMessage Hook)
```

```ts
// Senden (Webview → Extension):
const messages = useMessageService();
messages.send({ type: 'counterIncrement' });

// Empfangen (Extension → Webview):
useOnMessage((msg) => {
  if (msg.type === 'init' || msg.type === 'updateContent') {
    setState(msg.state);
  }
  if (msg.type === 'fileLoaded') {
    setFileName(msg.fileName);
    setFileContent(msg.content);
  }
});
```

### Warum `useOnMessage` statt `useEffect` direkt?

```ts
export function useOnMessage(handler: Handler): void {
  const svc = useMessageService();
  const ref = useRef(handler);      // ← immer aktuellste Version des Handlers
  ref.current = handler;
  useEffect(() => svc.on((msg) => ref.current(msg)), [svc]);
  //          ↑ läuft nur 1x    ↑ aber immer frischer Handler via Ref
}
```

Ohne den Ref-Trick würde `useEffect` bei jedem Render neu subscriben/desubscribieren.

---

## `acquireVsCodeApi()` — nur einmal erlaubt!

VS Code erlaubt pro Webview-Session genau **einen** Aufruf von `acquireVsCodeApi()`.
Deshalb ist der Aufruf in `webview/src/components/VsCode.tsx` zentralisiert:

```ts
// VsCode.tsx — genau eine Stelle, ein Aufruf
export const vscodeApi = acquireVsCodeApi<StateType>();
export const VsCodeContext = createContext<WebviewApi<StateType>>(vscodeApi);
```

`MessageService.ts` importiert `vscodeApi` von dort.
Webpack dedupliziert Module → der Aufruf passiert garantiert nur einmal pro Bundle.

---

## Content Security Policy (CSP)

VS Code Webviews blockieren standardmäßig alle Scripts.
`webview/src/template.html` enthält einen Platzhalter:

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src __CSP_SOURCE__; ..." />
```

`extension/src/webview.ts` ersetzt ihn beim Laden mit dem echten Wert:

```ts
const html = filecontent
  .replace(/(src|href)="(.+?)"/g, `$1="${mediaRootWeb}/$2"`)
  .replace('__CSP_SOURCE__', webview.cspSource);  // ← CSP
```

`webview.cspSource` ist ein VS Code-eigener Wert für die erlaubten Ressource-Quellen.

---

## Projektstruktur

```
common/src/main.ts                     ← Shared Types (AppState, Message-Typen)

extension/src/
  extension.ts                         ← Registriert Webviews beim MessageService
  MessageService.ts                    ← Broker: empfängt, verarbeitet, broadcasted
  webview.ts                           ← Lädt HTML, ersetzt Pfade + CSP

webview/src/
  services/
    MessageService.ts                  ← send(), on(), useOnMessage() Hook
  components/
    VsCode.tsx                         ← acquireVsCodeApi() — nur EINMAL; Context
    EditorCanvas.tsx
    EditorElement.tsx
  Sidebar.tsx                          ← Counter + Buttons, nutzt useOnMessage
  Editor.tsx                           ← Counter + Buttons + Dateiinfo, nutzt useOnMessage
  template.html                        ← HTML-Template mit CSP-Platzhalter
```

---

## Toolbar-Buttons (`editor/title`)

```
┌─────────────────────────────────────────────┐
│  test.5board                    [⊕]      ×  │  ← editor/title Toolbar
├─────────────────────────────────────────────┤
│                                             │
│  Counter: 4   [+]  [−]                      │
│  test.5board                                │
│  Pre Projekt Version erkannt: (3.6.6)       │
└─────────────────────────────────────────────┘
```

Toolbar-Buttons werden in `package.json` unter `contributes.menus.editor/title` registriert:

```json
"commands": [
  { "command": "5board-vsc.incrementFromToolbar", "title": "Increment Counter", "icon": "$(add)" }
],
"menus": {
  "editor/title": [
    {
      "command": "5board-vsc.incrementFromToolbar",
      "when": "resourceExtname == .5board",
      "group": "navigation"
    }
  ]
}
```

- `"group": "navigation"` → Button erscheint ganz rechts in der Tab-Leiste als Icon
- `"when": "resourceExtname == .5board"` → Button nur sichtbar wenn eine `.5board`-Datei aktiv ist
- `icon` nutzt VS Code Codicons: [Liste aller Icons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

### Toolbar → Extension → Webview

Toolbar-Buttons lösen VS Code **Commands** aus — kein direkter Webview-Zugriff.
Deshalb gibt es `MessageService.dispatch()`: es behandelt eine Nachricht so,
als hätte sie eine Webview gesendet, und broadcastet das Ergebnis an alle.

```
Toolbar-Button [⊕]
      │
      │  vscode.commands.executeCommand('5board-vsc.incrementFromToolbar')
      ▼
extension.ts: messages.dispatch({ type: 'counterIncrement' })
      │
      ▼
MessageService.handleMessage()  →  state.counter++
      │
      ▼
MessageService.broadcast({ type: 'updateContent', state })
      │
      ├──▶ Sidebar Webview  →  setState({ counter: 5 })
      └──▶ Editor Webview   →  setState({ counter: 5 })
```

---

## Split View (gleiche Datei, zwei Panels)

```
┌──────────────────────┬──────────────────────┐
│  test.5board         │  test.5board         │
├──────────────────────┼──────────────────────┤
│  Counter: 3  [+] [−] │  Counter: 3  [+] [−] │
└──────────────────────┴──────────────────────┘
        ↑ Panel 1               ↑ Panel 2
        beide im MessageService.webviews Set
```

Der Split View wird über den nativen VS Code Befehl ausgelöst
(Rechtsklick auf Tab → "Split Right", oder `Ctrl+\`).
VS Code ruft daraufhin **`resolveCustomEditor` erneut auf** — mit demselben `document`
aber einem neuen `webviewPanel`. Das neue Panel wird in `MessageService.registerEditor()`
eingetragen und bekommt sofort den aktuellen State per `ready`-Handshake.

**Voraussetzung — `supportsMultipleEditorsPerDocument: true`:**
Ohne diese Option verhindert VS Code, dass dieselbe Datei in zwei Panels gleichzeitig
offen ist und navigiert stattdessen zum bestehenden Panel.
```ts
vscode.window.registerCustomEditorProvider('5board-vsc.editor', provider, {
  webviewOptions: { retainContextWhenHidden: true },
  supportsMultipleEditorsPerDocument: true,  // ← nötig für Split View
});
```

### State-Sync zwischen beiden Panels

```
Panel 1: User klickt [+]
  → postMessage { type: 'counterIncrement' }
  → MessageService.state.counter = 4
  → broadcast { type: 'updateContent', state: { counter: 4 } }
          ├──▶ Panel 1 zeigt: Counter: 4
          └──▶ Panel 2 zeigt: Counter: 4  ← automatisch sync!
```

Beide Panels sind im selben `Set<vscode.Webview>` — broadcast erreicht alle.

---

## Per-Editor Daten (Dateiinhalt)

Manche Daten sind nicht geteilt (wie der Counter) sondern gehören zu einem
bestimmten Editor-Panel — z.B. der Inhalt der geöffneten `.5board` Datei.

Dafür gibt es `MessageService.registerEditor()`:

```ts
// extension.ts — statt register() für Editor-Panels:
messages.registerEditor(webviewPanel, {
  content: fileContent ?? '',
  fileName: vscode.workspace.asRelativePath(document.uri, false),
});
```

Intern speichert `MessageService` diese Daten pro Webview in einer `Map`.
Wenn das Panel `{ type: 'ready' }` sendet, werden sie zusammen mit `init`
nur an dieses eine Panel geschickt (`fileLoaded`-Nachricht):

```
Panel sendet 'ready'
  → Extension: { type: 'init',       state }          → nur an dieses Panel
  → Extension: { type: 'fileLoaded', content, fileName } → nur an dieses Panel
```

---

## Altes Dateiformat erkennen (`Editor.tsx`)

Das alte `.5board`-Format ist einzeiliges JSON mit `content.version`.
Der Editor erkennt das und zeigt statt dem rohen Inhalt nur einen Hinweis:

```tsx
function detectVersion(content: string): string | null {
  try {
    const parsed = JSON.parse(content);
    return parsed?.content?.version ?? null;
  } catch { return null; }
}

// In FileView:
{version ? (
  <p>Pre Projekt Version erkannt: ({version})</p>
) : (
  <pre>{fileContent || 'Datei ist leer.'}</pre>
)}
```

---

## React.memo — Performance bei Counter-Updates

Jedes `updateContent`-Message (also jeder Counter-Klick) würde ohne Optimierung
die gesamte Editor-Komponente neu rendern — inklusive des statischen Dateiinhalts.

`React.memo` verhindert das: `FileView` rendert nur neu wenn sich `fileName` oder
`fileContent` tatsächlich ändern, nicht bei jedem Counter-Update.

```tsx
const FileView = memo(function FileView({ fileName, fileContent }) {
  // rendert NUR neu wenn fileName oder fileContent sich ändern
  return ( ... );
});

export default function Editor() {
  // Counter/Buttons stehen ÜBER FileView → immer sichtbar, unabhängig von Inhaltslänge
  return (
    <EditorCanvas>
      <div>
        <h2>Counter: {state.counter}</h2>
        <button>+</button>
        <button>−</button>
        <FileView fileName={fileName} fileContent={fileContent} />
      </div>
    </EditorCanvas>
  );
}
```

**Warum Counter/Buttons oben?** Bei langen Dateien würden sie sonst unterhalb des
sichtbaren Bereichs verschwinden.

---

## Neuen Nachrichtentyp hinzufügen

1. **`common/src/main.ts`** — Typ zur Union hinzufügen
2. **Sendende Webview** — `messages.send({ type: 'meinTyp', ... })` aufrufen
3. **`extension/src/MessageService.ts`** — `handleMessage()` um den neuen `case` erweitern
4. **Empfangende Webview(s)** — `useOnMessage` Handler um `msg.type === 'meinTyp'` erweitern

---

## Bekannte Fallstricke & Fixes

### `context.subscriptions.push()` in Provider-Callbacks
`resolveCustomEditor` und `resolveWebviewView` werden von VS Code zu einem Zeitpunkt
aufgerufen, bei dem das interne DisposableStore in einem Sonderzustand ist. Disposables
dort hinzuzufügen führt zu:
```
Error: Trying to add a disposable to a DisposableStore that has already been disposed of.
```
**Fix:** `register()` gibt kein Disposable zurück — der Lifecycle wird intern via
`panel.onDidDispose(() => ...)` verwaltet. Kein `context.subscriptions.push()` nötig.

### `"type": "module"` in `common/package.json`
Mit `"type": "module"` behandelt TypeScript (Node16-Auflösung) das Paket als ESM.
Da die Extension CommonJS verwendet, schlägt der Import fehl:
```
TS1541: Type-only import of an ECMAScript module from a CommonJS module
        must have a 'resolution-mode' attribute.
```
**Fix:** `"type": "module"` entfernt, `"types": "dist/main.d.ts"` hinzugefügt.

### Erstes `pnpm run build` schlägt fehl
Wenn `node_modules` in einem der Pakete fehlt (z.B. nach einem frischen Checkout),
schlägt `tsc` mit `command not found` fehl.
**Fix:** Einmalig im Monorepo-Root ausführen:
```bash
pnpm install
```

---

## Build

```bash
# Einmalig (oder nach package.json-Änderungen):
pnpm install

# Im Monorepo-Root (baut common → webview → extension):
pnpm run build

# Extension starten:
F5 in VS Code → Extension Development Host
```
