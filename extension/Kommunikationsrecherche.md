# Kommunikationsrecherche 5Board.VSC

## Architektur-Diagramme

Die folgenden Diagramme visualisieren die in diesem Dokument beschriebene Architektur. Sie können mit der Desktop-Version von Draw.io oder online unter [app.diagrams.net](https://app.diagrams.net) geöffnet werden.

- [Aktuelle Architektur](./media/diagrams/aktuelle_architektur.drawio.xml)
- [Vorgeschlagene React-Architektur](./media/diagrams/react_architektur.drawio.xml)

## Komponentenübersicht

Die Extension besteht aus drei Hauptkomponenten:

1. **Extension Host (Backend):**
   - Dies ist der in Node.js laufende Hauptprozess der Extension (`src/extension.ts`).
   - Er ist verantwortlich für die Aktivierung, die Registrierung von Befehlen und die Bereitstellung des Custom Editors.
   - Er erstellt und verwaltet die Webview-Panels und ist die einzige Komponente, die direkten Zugriff auf das Dateisystem (`fs`) und die VS-Code-API hat.
2. **Webview (Frontend):**
   - Dies sind isolierte HTML/CSS/JS-Umgebungen, die innerhalb von VS Code als Tabs dargestellt werden. Es gibt zwei verschiedene Arten:
   - **Custom Editor Webview:** Wird automatisch für jede `*.5board`-Datei geöffnet. Ihre Aufgabe ist es, den Inhalt der Datei zu visualisieren. Aktuell ist sie nur lesend (`CustomReadonlyEditorProvider`).
   - **Kommando-basierte Webview:** Eine generische Webview, die über den Befehl `5board-vsc.helloWorld` geöffnet wird. Sie dient als statische Anzeigefläche und kann zwischen zwei Seiten (`index.html`, `seite2.html`) navigieren.
3. **`.5board`-Dateiformat:**
   - Ein in der `package.json` definierter eigener Dateityp.
   - Die Extension behandelt diese Dateien als JSON-Dateien, liest deren Inhalt und stellt ihn im Custom Editor dar.

## Kommunikationswege

Die Kommunikation erfolgt hauptsächlich zwischen dem Extension Host und den Webviews sowie zwischen dem Extension Host und dem Dateisystem. Eine direkte Kommunikation zwischen Webview und Dateisystem ist aus Sicherheitsgründen nicht möglich.

### 1. Extension Host ↔ Webview

Die Kommunikation ist bidirektional, aber asymmetrisch.

**Extension Host → Webview (Daten senden & UI aufbauen):**

Der Extension Host generiert und setzt den kompletten HTML-Inhalt der Webview.

- **Mechanismus:** `webviewPanel.webview.html = '...'`
- **Daten:** Der Host liest Daten aus dem Dateisystem, verarbeitet sie zu einem HTML-String und sendet diesen an die Webview. Lokale Ressourcen wie CSS- oder JS-Dateien werden über eine spezielle URI (`webview.asWebviewUri(...)`) für die Webview zugänglich gemacht.
- **Beispiel (Custom Editor):**
  1. Extension Host liest die `*.5board`-Datei mittels `fs.readFileSync`.
  2. Der Inhalt wird in eine HTML-Vorlage (`getEditorWebviewHtml`) eingefügt.
  3. Das fertige HTML wird an das Webview-Panel übergeben.

**Webview → Extension Host (Events/Aktionen senden):**

Die Webview kann Nachrichten an den Extension Host senden, um Aktionen auszulösen.

- **Mechanismus:** Im Webview-JavaScript wird `vscode.postMessage({ command: '...', payload: '...' })` aufgerufen. Im Extension Host wird ein Listener mit `webview.onDidReceiveMessage(...)` registriert.
- **Daten:** Es werden JSON-Objekte gesendet, die typischerweise einen `command` zur Identifizierung der Aktion und weitere Daten (`payload`) enthalten.
- **Beispiel (Navigation in der Kommando-basierten Webview):**
  1. Ein Klick auf einen Button in `index.html` ruft die JS-Funktion `navigate('seite2.html')` auf.
  2. Diese Funktion sendet die Nachricht: `{ command: 'navigate', page: 'seite2.html' }`.
  3. Der `onDidReceiveMessage`-Listener im Extension Host empfängt die Nachricht.
  4. Er prüft `message.command === 'navigate'` und ruft die Funktion `updateStaticWebview` auf, um den HTML-Inhalt der Webview mit dem Inhalt von `seite2.html` zu ersetzen.

### 2. Extension Host ↔ Dateisystem

- **Mechanismus:** Der Extension Host nutzt das Node.js-Modul `fs` (File System), um Dateien zu lesen.
- **Daten:** Es werden hauptsächlich die Inhalte der `*.5board`-Dateien (als UTF-8-String) sowie die statischen HTML-Dateien für die Webviews gelesen.
- **Beispiel:** `fs.readFileSync(document.uri.fsPath, 'utf8')` liest den Inhalt einer geöffneten `*.5board`-Datei.

## Integration von React für die Webview

Die aktuelle Methode, bei jeder Änderung die gesamte HTML-Seite neu zu laden, ist ineffizient. React ist eine exzellente Lösung, um eine reaktive UI zu schaffen, die gezielt auf Datenänderungen reagiert.

### Warum React?

- **Effiziente DOM-Updates:** React aktualisiert nur die Teile der UI, die sich tatsächlich geändert haben. Das ist deutlich performanter als das Neuladen der gesamten Seite.
- **Zustandsverwaltung:** React-Komponenten verwalten ihren eigenen Zustand, was die Entwicklung komplexer UIs vereinfacht.
- **Komponentenbasierte Architektur:** Fördert wiederverwendbaren und gut strukturierten UI-Code.

### Wie kann React integriert werden?

**1. Build-Prozess einrichten:**

- Da das Projekt bereits `webpack` und `ts-loader` nutzt, kann die Konfiguration in `webpack.config.js` erweitert werden.
- Es wird ein neuer **Entry Point** für die React-Anwendung benötigt, z.B. `src/webview/index.tsx`.
- Webpack kompiliert diesen `.tsx`-Code zu einer einzigen JavaScript-Datei, z.B. `dist/webview.js`.

**2. Host-HTML-Seite anpassen:**

- Die Funktion `getEditorWebviewHtml` in `extension.ts` wird stark vereinfacht. Sie liefert nur noch ein Grundgerüst aus:
  ```html
  <!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <title>5Board Editor</title>
      <link rel="stylesheet" href="${styleUri}">
    </head>
    <body>
      <div id="root"></div>
      <script src="${scriptUri}"></script>
    </body>
  </html>
  ```
  - `scriptUri` würde hier auf die gebundelte Datei (`dist/webview.js`) verweisen.
  - `<div id="root">` ist der Mount-Point für die React-Anwendung.

**3. React-Anwendung erstellen (in** **`src/webview/index.tsx`):**

- Dies ist der Startpunkt der Frontend-Logik.
  ```tsx
  import * as React from 'react';
  import * as ReactDOM from 'react-dom/client';

  // Die Hauptkomponente der Anwendung
  function App() {
    const [data, setData] = React.useState(null);
    const vscode = acquireVsCodeApi();

    React.useEffect(() => {
      // Listener für Nachrichten vom Extension Host
      const handleMessage = (event) => {
        const message = event.data;
        if (message.command === 'initData') {
          setData(message.payload);
        }
      };
      window.addEventListener('message', handleMessage);

      // Cleanup-Funktion
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }, []);

    const handleSave = () => {
      vscode.postMessage({
        command: 'saveData',
        payload: data 
      });
    };

    if (!data) {
      return <div>Lade Daten...</div>;
    }

    // Hier wird die eigentliche UI basierend auf 'data' gerendert
    return (
      <div>
        <h1>5Board Editor (React)</h1>
        <pre>{JSON.stringify(data, null, 2)}</pre>
        <button onClick={handleSave}>Speichern</button>
      </div>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
  ```

**4. Kommunikationsfluss mit React:**

- **Initialisierung:**
  1. Der Extension Host liest die `.5board`-Datei.
  2. Er sendet eine Nachricht an die Webview: `webview.postMessage({ command: 'initData', payload: fileContentAsJson })`.
  3. Der `useEffect`-Hook in der `App`-Komponente empfängt die Daten und speichert sie im React-State (`setData`). Die UI wird gerendert.
- **Aktualisierung & Speichern:**
  1. Eine Nutzeraktion in der React-UI ändert den lokalen State.
  2. Wenn der Nutzer auf "Speichern" klickt, sendet die React-App den aktuellen State an den Host: `vscode.postMessage({ command: 'saveData', payload: data })`.
  3. Der Extension Host empfängt die Nachricht, validiert die Daten und schreibt sie in die `.5board`-Datei.

## Lifecycle

### 1. Aktivierung der Extension

- **Trigger:** Die Extension wird aktiviert, sobald eine `*.5board`-Datei geöffnet wird (implizite Aktivierung durch `customEditors` in `package.json`) oder der Befehl `5board-vsc.helloWorld` ausgeführt wird.
- **Ablauf in** **`activate()`:**
  1. Der Befehl `5board-vsc.helloWorld` wird registriert. Bei Ausführung erstellt er ein neues Webview-Panel und lädt `index.html`.
  2. Ein `CustomReadonlyEditorProvider` wird für den `viewType` `5board-vsc.editor` registriert. Dieser Provider ist für alle `*.5board`-Dateien zuständig.
  3. Alle registrierten Elemente (`disposables`) werden in `context.subscriptions` gespeichert, um bei der Deaktivierung automatisch freigegeben zu werden.

### 2. Öffnen einer `.5board`-Datei (Custom Editor)

1. **`openCustomDocument(uri)`:** VS Code ruft diese Methode auf. Sie gibt ein einfaches `CustomDocument`-Objekt zurück, das die URI der Datei kapselt.
2. **`resolveCustomEditor(document, webviewPanel)`:** Diese Methode wird aufgerufen, um die UI des Editors zu erstellen.
   - Die Webview-Optionen werden gesetzt (z.B. `enableScripts: true`).
   - Der Inhalt der `*.5board`-Datei wird synchron vom Dateisystem gelesen (`fs.readFileSync`).
   - Die Funktion `getEditorWebviewHtml` wird aufgerufen. Sie bettet den gelesenen Dateiinhalt in eine HTML-Struktur ein.
   - Der generierte HTML-String wird der Eigenschaft `webviewPanel.webview.html` zugewiesen, wodurch der Inhalt im Editor-Tab sichtbar wird.

### 3. Speichern von Daten

- Aktuell ist **keine Speicherlogik** implementiert. Der `CustomReadonlyEditorProvider` deutet bereits an, dass der Editor nur lesend ist. Es gibt keine `postMessage`-Aufrufe vom Custom Editor zurück zum Host und keine `fs.writeFileSync`-Aufrufe.

### 4. Deaktivierung der Extension

- **Trigger:** Wird von VS Code ausgelöst, z.B. beim Schließen des Fensters.
- **Ablauf:**
  1. Die `deactivate()`-Funktion wird aufgerufen (ist aktuell leer).
  2. VS Code gibt alle in `context.subscriptions` registrierten Ressourcen frei. Dies schließt die registrierten Befehle und den Custom Editor Provider.
  3. Durch die Freigabe des Providers werden auch alle zugehörigen Webview-Panels automatisch geschlossen und deren Ressourcen bereinigt.

## Offene Fragen / Unsicherheiten

- **Einseitiger Datenfluss im Editor:** Der Custom Editor kann aktuell nur Daten anzeigen. Es fehlt eine Kommunikationslogik (Webview → Extension Host), um Änderungen zu übermitteln und zu speichern. Für einen vollwertigen Editor müsste ein `CustomEditorProvider` (statt `CustomReadonlyEditorProvider`) implementiert und die Nachrichtenbehandlung erweitert werden.
- **Fehlerbehandlung:** Das Einlesen von Dateien (`fs.readFileSync`) ist nur rudimentär abgesichert. Schlägt das Lesen in `updateStaticWebview` fehl, stürzt die Extension ab. Schlägt es im Custom Editor fehl, wird nur eine Standardmeldung angezeigt, aber der Benutzer erhält keine klare Fehlermeldung.
- **Fehlende Datei** **`main.js`:** Die Funktion `getEditorWebviewHtml` referenziert ein Skript `media/webview/main.js`, dessen Inhalt und Funktion unbekannt sind, da es im Projektverzeichnis nicht existiert.
- **Zustandslosigkeit:** Die Webviews verwalten keinen eigenen Zustand. Bei jeder Navigation in der Kommando-basierten Webview wird die komplette HTML-Seite neu vom Dateisystem geladen. Dies ist für statische Inhalte in Ordnung, bei komplexeren UIs aber ineffizient.

