# Contributing Guide

Dieses Dokument definiert die Coding-Standards, den Workflow und die Regeln für die Zusammenarbeit in diesem Projekt. Ziel ist es, Konsistenz, Wartbarkeit und effektive Teamarbeit sicherzustellen.

# 1. Sprachregeln

- Code, Variablennamen und Kommentare: **Englisch**
- Commit Messages, Branch Namen, PR Titel: **Englisch**
- Issues, Diskussionen und Wiki: **Deutsch** (oder Englisch, aber dann einheitlich)

**Sprachen innerhalb eines Artefakts nicht mischen.**

---

# 2. Git Workflow

### Branch Naming

- `feature/<issue-id>-<short-description>`
- `fix/<issue-id>-<short-description>`
- `chore/<issue-id>-<short-description>`

Falls der Branch zu einem Issue gehört, muss die Issue-ID im Namen enthalten sein.

Beispiele:

```
feature/123-add-canvas-toolbar
fix/45-export-bug
chore/78-update-eslint-config
```

---

## Commits

Regeln:

- klein schreiben
- kurz und präzise formulieren
- keine unklaren Messages wie "changes" oder "fix stuff"

---

## Merge Requests

Jeder muss:

- **ein klar abgegrenztes Thema** behandeln
- eine verständliche Beschreibung enthalten
- von mindestens **einer anderen Person reviewed** werden

### Template

```
## What
Was wurde implementiert?

## Why
Warum ist die Änderung notwendig?

## How to test
Schritte zum Testen
```

---

# 3. Code Style

## Naming Conventions

- Variablen: `camelCase`
- Konstanten: `UPPER_CASE`
- React Komponenten: `PascalCase`
- Dateinamen: `kebab-case`

## Dateistruktur

- Eine Komponente pro Datei
- Dateiname entspricht dem Komponentennamen

Beispiel:

```
Canvas.tsx
```

---

## TypeScript Regeln

- `any` vermeiden
- eigene Interfaces/Types definieren
- ...

---

## React Guidelines

- Nur Functional Components verwenden
- Hooks statt Klassen und Hooks auch nur wenn sie einen Mehrwert liefern
- Wiederverwendbare Logik in Custom Hooks auslagern

Beispielstruktur:



---

# 4. Projektstruktur



---

# 5. Issues

Jedes Issue sollte enthalten:

- Zielbeschreibung
- Kontext
- Akzeptanzkriterien

Beispiel: siehe angelegtes Template

---

# 6. Definition of Done

Eine Aufgabe gilt nur als erledigt, wenn:

- Code lokal läuft
- Linting erfolgreich ist
- Funktionalität getestet wurde (mindestens manuell)
- PR reviewed und freigegeben wurde
- keine TODO Kommentare mehr vorhanden sind

---

# 7. Testing

- Jede Funktion muss mindestens manuell getestet werden

---

# 8. Dokumentation

Die README muss enthalten:

- Setup Anleitung
- Überblick über die Projektstruktur
- wichtige Commands