# 5Board.VSC

## Projektstruktur

### `extension`

Das eigentliche VS Code-Erweiterungspaket. Stellt einen Custom Editor für `.5board`-Dateien bereit. Der Build läuft über **webpack**.

### `common`

Gemeinsam genutztes TypeScript-Paket (`5board.vsc-common`), das von `extension` und `webview` als Abhängigkeit eingebunden wird. Enthält geteilte Typen und Hilfsfunktionen. Wird mit `tsc` direkt nach `dist/` kompiliert.

### `webview`

Die React-basierte Benutzeroberfläche, die innerhalb des VS Code-Webviews läuft. Wird mit **webpack** zu einem einzelnen Bundle (`index.js` + `index.html`) gebaut und anschließend von der Extension unter `media/webview/` ausgeliefert. Nutzt React 19 und hat Zugriff auf das `common`-Paket.

## Skripte

| Skript            | Beschreibung                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `build`           | Baut alle Pakete der Reihe nach: `common` → `webview` → `extension` |
| `build:common`    | Baut nur das `common`-Paket                                         |
| `build:webview`   | Baut nur das `webview`-Paket                                        |
| `build:extension` | Baut nur das `extension`-Paket                                      |
| `watch`           | Startet alle `watch:*`-Skripte parallel                             |
| `watch:common`    | Startet den TypeScript-Watcher für `common`                         |
| `watch:webview`   | Startet den webpack-Watcher für `webview`                           |
| `watch:extension` | Startet den webpack-Watcher für `extension`                         |
| `package`         | Bereinigt alle Pakete und erzeugt das `.vsix`-Paket via `vsce`      |
| `format`          | Formatiert alle Dateien mit Prettier                                |
| `format:check`    | Prüft die Formatierung ohne Änderungen zu schreiben                 |
| `prepare`         | Initialisiert Husky (Git Hooks)                                     |


## Automatisches Formatieren
Für das automatische Formatieren ist Prettier eingebunden. Im Pre-Commit Git hook wird das formatieren immer automatisch ausgeführt. Um automatisch zu formatieren beim Speichern einer Datei, reicht es die VS Code Extension `Prettier - Code formatter` zu installieren. Sicher gehen, dass in den Einstellungen 'Editor: Default Formatter' auf 'Prettier - Code formatter' steht und 'Editor: Format On Save' aktiviert ist.
