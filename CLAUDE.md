# Projektanweisungen für Claude

Projekt: zskarte (Karte, Journal, Such-Dienst) mit Deployment über `zskarte.sh`. Der Code liegt im Ordner `zskarte/`, Deployment und Such-Dienst im Wurzelordner.

## Versionen und Änderungsprotokoll

Die Version steht an diesen Stellen und muss zusammen gesetzt werden:

- `zskarte/packages/app/package.json` (Feld `version`)
- `zskarte/packages/server/package.json` (Feld `version`)
- `zskarte/package-lock.json` (Workspace-Einträge `packages/app` und `packages/server`)
- `zskarte/CHANGELOG.md` (neuer Abschnitt `## x.y.z` oben, direkt unter `# Changelog`)

Die App zeigt den Changelog-Eintrag nur an, wenn die Version in `package.json` zum Abschnitt passt.

### Wann eine neue Version fällig ist

- Spätestens nach **5 Commits** seit dem letzten Versions-Commit.
- Sofort bei **größeren Änderungen**: Major-Upgrade einer Abhängigkeit, neue Funktion, Änderung am Deployment oder am Datenformat, Breaking Change.
- Kleine Fixes und reine Doku-Commits zählen nur als Commits.

### Zählweise

- Die dritte Stelle wird um 1 erhöht: 7.0.1 → 7.0.2 → … → 7.0.9.
- Nach 7.0.9 kommt 7.1.0. Danach 7.1.1 … 7.1.9, dann 7.2.0.
- Die erste Stelle (Major) wird nicht von Claude erhöht. Das entscheidet der Nutzer.

### Ablauf bei einem Versionsschritt

1. Neuen Abschnitt oben in `zskarte/CHANGELOG.md` schreiben. Stichpunkte auf Deutsch, kurz, aus Sicht der Nutzer.
2. Version in `zskarte/packages/app/package.json` und `zskarte/packages/server/package.json` setzen.
3. Im Ordner `zskarte/` ausführen: `npm install --package-lock-only --ignore-scripts`. Das aktualisiert nur die Workspace-Versionen im Lockfile. Prüfen, dass `git diff` im Lockfile nur diese Zeilen zeigt.
4. Die Änderungen als eigenen Commit `Version x.y.z` committen. Der Zähler beginnt danach neu.

## Upgrades von Abhängigkeiten

- Jede Abhängigkeit (oder eine Gruppe, die nur zusammen geht, etwa Angular) in einem eigenen Commit aktualisieren.
- Vor dem Commit prüfen: Lint der App und des Servers, Produktionsbuild der App, Unit-Tests des Servers (`npm run test:unit` im Ordner `zskarte/packages/server`) und lokales Deployment mit Smoke-Test.
- Die Playwright-Tests laufen gegen das lokale Deployment. Vorher bekannt fehlschlagende Tests sind in `TODO.md` vermerkt. Neue Fehlschläge sind ein Problem.
- Scheitert ein Upgrade nach **3 Versuchen**, wird es übersprungen und in `TODO.md` unter „Upgrades (zu aktualisieren)“ mit dem Grund eingetragen.
- Dienste, die gesondert bleiben (Strapi und seine Plugins), werden nicht aktualisiert, solange der Nutzer das nicht ausdrücklich verlangt.
- Sicherheitsbefunde aus Upgrades werden in `security-improvement-report.md` nachgetragen.

## Git

- Commits gehen auf `main`.
- Commits werden nur gemacht, wenn der Nutzer dazu auffordert. Pushen nur auf ausdrückliche Anweisung.
