# TODO

Stand: 2026-11-23. Erledigte Punkte stehen nicht mehr hier, Details stehen in der Git-Historie.

## Offen

### Sicherheit (Audit 2 und 3)
- [ ] A1. Share-Login-Ratenbegrenzung wirkt hinter Traefik für alle Nutzer gemeinsam. Fix: `proxy: true` in `packages/server/config/server.ts`, danach den 11-Versuche-Test wiederholen.

### PDF-Druck (pdfme)
- [ ] Entscheidung: pdfme entfernen und die Standardvorlage (82 Elemente) im Code rendern (jsPDF, qrcode). Aufwand laut Einschätzung kleiner als gedacht. Referenz-PDF liegt unter `C:\Users\patrick\AppData\Local\Temp\baseline-pdfme-current-with-appurl.pdf`. Das entfernt auch die `core-js`- und `fix-esm`-Kette.

### npm-Deprecations ohne Strapi-Bezug
- [ ] `fix-esm` / `@babel/plugin-proposal-export-namespace-from`: `fix-esm` wird für `superjson` gebraucht, das reines ESM ist. Lösung nur über anderes Serialisierungspaket oder ESM-Umbau des Servers.
- [ ] `core-js@2.6.12` über `@pdfme` → `form-render` → `rc-color-picker` → `rc-trigger` 1.x → `babel-runtime` 6. Override auf core-js 3 scheitert (`core-js/library` fehlt in v3). Lösung nur über den PDF-Umbau.
- [ ] `fstream@1.0.12`, `lodash.isequal@4.5.0`: über `exceljs` (neueste Version). Lösung nur über Austausch der Excel-Bibliothek (`journal.service.ts`, `listViewEntry.ts`).

### OpenLayers-Patch
- [ ] Bei jedem Upgrade von `ol` (aktuell 10.11.0): `zskarte/patches/ol+10.11.0.patch` prüfen und neu erzeugen. Bricht der Build bei `patch-package` ab, passt der Patch nicht mehr.

### Upgrades (zu aktualisieren)
- [ ] `@pdfme/converter` bleibt per `overrides` auf 6.0.6. Ohne den Override zieht 6.2.x das Node-only-Paket `clawpdf` in den Browser-Build. Prüfen, ob eine neuere 6.x-Version ohne `clawpdf` erscheint, dann Override entfernen.
- [ ] `shpjs` (Server) von 5.0.2 auf 6.x aktualisieren. Der CommonJS-Einstieg von 6.x ist ein Browser-Bundle (`self` fehlt), `strapi build` bricht ab. Warten auf ESM-Umbau des Servers oder ein Release mit Node-Einstieg.
- [ ] TypeScript 7 (aktuell 6.0.3). Angular 22 verlangt TypeScript `>=6.0 <6.1`, und TypeScript 7 bietet die klassische Compiler-API nicht mehr. Erst mit einer Angular-Version, die TypeScript 7 unterstützt.
- [ ] Biome 2 aufräumen: CSS- und HTML-Lint sind aus, drei Regeln sind aus (`useIterableCallbackReturn`, `noNonNullAssertedOptionalChain`, `noInvalidUseBeforeDeclaration`). Die Regeln prüfen und wieder einschalten, wo sie passen. Der Lint der Templates (`a11y`) ist ungeprüft.
- [ ] Server-Tsconfig: TypeScript 6 meldet Deprecations (`baseUrl`, `moduleResolution: node10`) aus der Strapi-Basiskonfiguration. Vor TypeScript 7 beheben.

## Audit 2026-11-27 (offen)
- [ ] Shapefile-Laden (`zskarte/packages/server/src/state/shp-loader.ts`): Eine Datei ohne ZIP wird zweimal vollständig geladen, einmal zum Prüfen der Kennung und einmal von `shpjs`. Die Abkürzung braucht eine andere `shpjs`-Schnittstelle, weil ein einzelnes `.shp` seine `.dbf`-Nachbardatei über die URL findet. Die Quellen-ZIPs sind der Standard, die entpackten `.shp` des Servers laufen aber über denselben Pfad, deshalb blieb der Zweig bestehen.

- [ ] `zod` 3.25.76 (Advisory GHSA-mrhx-c7xc-m3w5, high): kommt über `koa-body` und `koa-session` aus dem Strapi-Core. Lösung nur über ein Strapi-Update, das diese Pakete aktualisiert.
- [ ] `zskarte/packages/app/src/environments/environment.prod.ts` ist veraltet (ohne `codeLoginEnabled` und `workLocalEnabled`). `npm run build:app` lokal bricht deshalb ab. Der Docker-Build erzeugt die Datei vorher selbst. Lösung: die Datei per `node packages/app/scripts/write-environment.js` neu erzeugen und einchecken, oder den lokalen Build-Schritt anpassen.

## Audit 2026-11-28 (offen)
Reihenfolge nach Wichtigkeit. Die Punkte 1 und 2 zuerst.

### Muss beheben
- [ ] 1. Nur-Lesen-Freigaben können Daten ändern (`zskarte/packages/server/src/middlewares/accessControl.ts`, ca. Zeile 314 und 394). Der Server speichert `permission` im Token, prüft es aber nie. Ein Lese-Token darf Kartenänderungen senden (`/api/operations/mapstate/patch`), Journal-Einträge anlegen, die Einsatzstelle archivieren (`/operations/:id/archive`) oder ausblenden (`/operations/:id/shadowdelete`). Die App blendet diese Knöpfe nur aus. Fix: In `accessControl.ts` jede Anfrage außer GET ablehnen, wenn das Token `read` sagt. Die Standort-Route (`currentlocation`) offen lassen. Einen Test ergänzen: Lese-Token auf der Patch-Route muss 403 bekommen. Ob Name und Kartenebenen (`updateMeta`, `updateMapLayers`) ebenfalls betroffen sind, ist nicht bis zum Ende geprüft.
- [ ] 2. Einmalcodes sperren den Nutzer nach dem Login aus (`zskarte/packages/server/src/api/access/controllers/access.ts`, ca. Zeile 91-103; `accessControl.ts` ca. Zeile 394; `state/socketio.ts` ca. Zeile 58). Der Code wird beim Login gelöscht (Commit `ca600bf`). Das Token zeigt weiter auf die gelöschte Zeile. Seit Commit `25e89cf` (27.11.) prüft jede Anfrage diese Zeile, findet sie nicht und antwortet mit "This share link is no longer active." Die Unit-Tests und der E2E-Test prüfen nur den Login, deshalb fällt es nicht auf. Fix: Einmal-Tokens im Token markieren und bei `refresh`, in der Middleware und beim Socket-Verbindungsaufbau die Zeilenprüfung für sie überspringen. Test: Login mit Code, dann eine Anfrage, die gelingen muss. Außerdem entscheiden, wie lange solche Tokens gelten. Heute sind es 30 Tage (Strapi-Standard), für einen Einmalcode zu lang.

### Sollte beheben
- [ ] 3. Deaktivierte Freigaben behalten offene Live-Verbindungen (`zskarte/packages/server/src/api/access/controllers/access.ts` ca. Zeile 169; `src/state/access.ts` ca. Zeile 11). Offene Sockets werden nur beim API-Löschen einer Freigabe getrennt. Setzen von `active` auf false über die Update-Route trennt nichts. Die stündliche Bereinigung abgelaufener Freigaben löscht ebenfalls ohne Trennung. Fix: `disconnectShareSockets` auch beim Deaktivieren und in `deleteExpiredAccessTokens` aufrufen (ca. 4 Zeilen).
- [ ] 4. Geister-Nutzer nach schnellem Verbindungsabbruch (`zskarte/packages/server/src/state/socketio.ts` ca. Zeile 85-88). Der Listener für "disconnect" wird erst nach mehreren `await`-Schritten registriert. Bricht die Verbindung in diesem Fenster ab, entfernt niemand den Eintrag. Die Karte wird dann nie aus dem Speicher freigegeben, weil die Bereinigung nur Karten ohne Verbindungen löscht. Fix: Nach dem `push` `socket.connected` prüfen und bei false sofort `socketDisconnect` aufrufen (2-3 Zeilen).
- [ ] 5. Falsche Codes sperren alle Freigabe-Logins für 15 Minuten (`zskarte/packages/server/src/api/access/controllers/access.ts` ca. Zeile 55; `lib/code-guess-guard.ts`). Die Gesamtgrenze (100 Fehlversuche in 15 Minuten über alle Clients) gilt für alle gemeinsam. Sie greift, bevor klar ist, ob die Eingabe ein Kurzcode ist. Fehlversuche mit langen Links zählen mit. Fall: Ein Client schickt 10 falsche Codes pro Minute über 10 Minuten. Danach kann sich niemand mehr über einen Freigabe-Link anmelden, auch nicht mit richtigem langem Link. Fix: Begrenzung nur für Kurzcodes anwenden (`accessToken.length < 32`). Hinweis: Die Begrenzung pro Client wirkt hinter Traefik nicht (A1).
- [ ] 6. Zeitgesteuerte Jobs laden jede aktive Karte (`zskarte/packages/server/src/state/operation.ts` ca. Zeile 214 und 276). Archivierung (stündlich) und Snapshots (alle 5 Minuten) laden alle aktiven Einsätze mit vollständiger Karte und überspringen die meisten erst im Code anhand von `updatedAt`. Bei 50 Einsätzen mit je 2 MB (Schätzung) werden alle 5 Minuten etwa 100 MB geladen. Fix: `updatedAt` in die Datenbankabfrage aufnehmen, eine Zeile pro Job.
- [ ] 7. Doppelter Code (`zskarte/packages/server/src/api/access/controllers/access.ts` ca. Zeile 25; `src/state/socketio.ts` ca. Zeile 12 und 132-150). `sanitizeUser` ist zweimal mit denselben Löschungen geschrieben. `broadcastPatches` und `broadcastJournal` sind fast gleich. Fix: Eine `sanitizeUser` und eine Hilfsfunktion für "an die anderen Verbindungen senden". Ca. 15 Zeilen weniger.

### Schön zu haben
- [ ] 8. Jede Standortänderung schickt die Liste aller Nutzer an alle (`zskarte/packages/server/src/state/operation.ts` ca. Zeile 161; `src/state/socketio.ts` ca. Zeile 112). Bei 50 Nutzern, die sich gleichzeitig bewegen, sind das bis zu rund 2.500 Nachrichten pro Sekunde. Für Dutzende Nutzer okay. Fix bei Bedarf: nur den geänderten Standort senden.
- [ ] 9. `searchserv/requirements.txt` enthält etwa 45 Pakete, der Code importiert nur `fastapi`, `psycopg`, `psycopg_pool` und `uvicorn`. Verdächtig ungenutzt: `ujson`, `orjson`, `python-multipart`, `typer`, `rich`, `watchfiles`, `uvloop`. Mit pip nicht geprüft. Fix: Datei aus den vier direkten Paketen neu erzeugen und Docker-Start prüfen. Möglich: ca. 20 Pakete weniger.
- [ ] 10. Log-Zeile gibt einen Freigabe-Code aus (`zskarte/packages/server/src/state/access.ts` ca. Zeile 14). Der Code ist schon abgelaufen, also heute harmlos. Fix: Dokument-ID statt Code loggen.

### Zu prüfen
- [ ] Ob die stündliche Bereinigung abgelaufener Freigaben überhaupt löscht. Sie übergibt `Date.now()` (eine Zahl in Millisekunden) an ein Datum-Feld. Lehnt die Datenbank das ab, schreibt der Job nur einen Fehler ins Log und löscht nichts. Prüfen: Im Server-Log nach "Expired Access token got deleted" suchen, nachdem eine Freigabe abgelaufen ist. Mit Docker-Datenbank direkt testen.
- [ ] Ob zwei gleichzeitig gestartete Kartenlayer-Updates (z. B. Doppelklick auf "trigger-update") dieselben Mediendateien schreiben.
- [ ] Nicht geprüft: Großteil der Angular-App (Offline-Sync, Import-Dialog, Texteditor, Kartenrenderer), `mapserv`, `searchserv-db-init`, `workers/`, Migrationen.

## Bewusst offen
- Sicherheit, vom Betreiber akzeptiert: A2 (Beispiel-Secrets in der Server-`.env` bei `zskarte.sh start`) und A6 (Passwort-Fallback `supersecret123` für die Datenbank).
- React, react-dom, react-router-dom und styled-components bleiben im Server: Strapi verlangt sie für den Admin (`strapi build` bricht ohne sie ab).
- Strapi-Warnungen (`glob@7`, `@koa/router@12`, `node-abort-controller`, `rimraf`, `inflight`, `uuid@8`): Lösung über Strapi-Updates. Strapi 5.64.0 ist das aktuelle latest (seit 2026-11-27 eingesetzt).
- Upgrade-Lauf 2026-11-23: Strapi, `strapi-plugin-config-sync` und `strapi-provider-upload-azure-storage` blieben unverändert, laut Vorgabe.
- Strapi-Upgrade 2026-11-27 auf Anweisung: Core und `@strapi/plugin-users-permissions` auf 5.64.0. `strapi-plugin-config-sync` und `strapi-provider-upload-azure-storage` blieben unverändert.
- `zskarte.bat`: bleibt vorerst. Entscheidung, ob löschen oder synchron halten.
- Strapi-Warnung `admin.auth.options.expiresIn` stammt aus Strapi-Defaults.
- `rc-color-picker` React-16-Peer-Konflikt: nicht blockierend.
- Beispiel-Passwörter (`supersecret123`, `zskarte`, `postgres2`) bleiben laut Vorgabe, Nutzer ändern sie selbst.
- Dev-Umgebung `environment.dev.ts` zeigt auf den Upstream-Testserver `api-test.zskarte.ch`.
