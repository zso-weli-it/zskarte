# TODO

Stand: 2026-11-22. Erledigtes ist kurz zusammengefasst, Details stehen in der Git-Historie.

## Offen

### Sicherheit (Audit 2)
- [ ] A1. Share-Login-Ratenbegrenzung wirkt hinter Traefik für alle Nutzer gemeinsam. Fix: `proxy: true` in `packages/server/config/server.ts`, danach den 11-Versuche-Test wiederholen.
- [ ] A2. Beispiel-Secrets aus `.env.example` werden bei `zskarte.sh start` übernommen. Fix: Zufallswerte erzeugen (`zskarte/gen-server-env.sh` nutzen), prüfen, dass die Server-`.env` keine Beispielwerte mehr enthält.
- [ ] A3. Offener Proxy `GET /api/proxy?url=` (`packages/server/src/api/proxy/`). Frontend nutzt ihn nicht. Fix: Route, Controller und `axios` entfernen.
- [ ] A4. XSS über Adress-Token im Editor (`contenteditable/address-token.blot.ts:13, 15`). Fix: `textContent` statt `innerHTML`. Der Test `tests/journal-address-xss.spec.ts` schlägt bis dahin fehl.
- [ ] A7. `zskarte.sh` bricht nicht ab, wenn bei `ZSK_TRAEFIK=true` eine Pflicht-Variable leer ist.
- [ ] A8. Socket.io erlaubt alle Origins (`state/socketio.ts`, `origin: '*'`). Auf App-Host einschränken.
- [ ] A9. Rohe User-Eingaben in den Logs (`accessControl.ts`, `logAccessViolation`). Escapen.
- [ ] A10. Rate-Limit-Map wächst mit vielen IPs. Alte Einträge bei jedem Aufruf entfernen.

### Daten
- [ ] A5. Journal-Nummer beim Ändern (`journal-entry.ts`, `update`) ist ohne Sperre. Fix: gleiche `pg_advisory_xact_lock` wie beim Anlegen.
- [ ] A6. DB-Passwort-Fallback `supersecret123` in `packages/server/config/database.ts:11`. Default entfernen.
- [ ] A11. `write-environment.js` schreibt Werte ohne Escaping. `JSON.stringify` verwenden.

### Betrieb
- [ ] Das separate Deployment-Skript (schreibt `environment.prod.ts`) ablösen. Die Datei entsteht jetzt beim Image-Build aus `deploy.env`.

### PDF-Druck (pdfme)
- [ ] Entscheidung: pdfme entfernen und die Standardvorlage (82 Elemente) im Code rendern (jsPDF, qrcode). Aufwand laut Einschätzung kleiner als gedacht. Referenz-PDF liegt unter `C:\Users\patrick\AppData\Local\Temp\baseline-pdfme-current-with-appurl.pdf`. Das entfernt auch die `core-js`- und `fix-esm`-Kette.

### npm-Deprecations ohne Strapi-Bezug
- [ ] `fix-esm` / `@babel/plugin-proposal-export-namespace-from`: `fix-esm` wird für `superjson` gebraucht, das reines ESM ist. Lösung nur über anderes Serialisierungspaket oder ESM-Umbau des Servers.
- [ ] `core-js@2.6.12` über `@pdfme` → `form-render` → `rc-color-picker` → `rc-trigger` 1.x → `babel-runtime` 6. Override auf core-js 3 scheitert (`core-js/library` fehlt in v3). Lösung nur über den PDF-Umbau.
- [ ] `fstream@1.0.12`, `lodash.isequal@4.5.0`: über `exceljs` (neueste Version). Lösung nur über Austausch der Excel-Bibliothek (`journal.service.ts`, `listViewEntry.ts`).

### OpenLayers-Patch
- [ ] Bei jedem Upgrade von `ol` (aktuell 10.11.0): `zskarte/patches/ol+10.11.0.patch` prüfen und neu erzeugen. Bricht der Build bei `patch-package` ab, passt der Patch nicht mehr.

## Bewusst offen
- Strapi-Warnungen (`glob@7`, `@koa/router@12`, `node-abort-controller`, `rimraf`, `inflight`, `uuid@8`): Lösung über Strapi-Updates. Strapi 5.63.0 ist das aktuelle latest.
- Offene Major-Updates (`@pdfme` 6, `react` 19, `typescript` 7, `uuid` 14 u. a.): nur bei Bedarf.
- `zskarte.bat`: bleibt vorerst. Entscheidung, ob löschen oder synchron halten.
- `zskarte2/` wird ignoriert.
- Strapi-Warnung `admin.auth.options.expiresIn` stammt aus Strapi-Defaults.
- `rc-color-picker` React-16-Peer-Konflikt: nicht blockierend.
- Beispiel-Passwörter (`supersecret123`, `zskarte`, `postgres2`) bleiben laut Vorgabe, Nutzer ändern sie selbst.
- Dev-Umgebung `environment.dev.ts` zeigt auf den Upstream-Testserver `api-test.zskarte.ch`.

## Erledigt (Kurzfassung)

### Betrieb und Deployment
- Named Volumes für Postgres und pgAdmin, Postgres 18.1, pgAdmin 9, Node 26.13.1, nginx 1.29.3.
- Konfiguration über `deploy.env` (Domains, Traefik, Frontend-URLs, Suchlabel, App-URL für QR-Code).
- Traefik-Betrieb über Compose-Overrides, produktiv getestet.
- Tileserver-Init lädt die 1-GB-Karte nur bei geänderter Remote-Datei.
- DB-Migration über Dump und Restore, Doku in der README.
- nginx: `server_tokens off`, `nosniff`, `Referrer-Policy`.
- Such-Service: Healthcheck, Pool-Check, Python 3.15, bbox-Prüfung, Geo-Index genutzt.

### Anwendung
- Versionsangabe `<version>-<commit>` (Version 7.0.0) auf der Login-Seite und im Service Worker.
- Signaturen und Freigabelink auch über http-Adressen.
- Suchlabel über `ZSK_ORG_NAME`.
- QR-Code des Journals zeigt auf die konfigurierte App-Adresse.
- OpenLayers-Patch: keine Canvas-Konsolenwarnung.
- Entfernt: `@angular/animations`, `@angular/platform-browser-dynamic`, `src/test.ts`, `ngx-indexed-db`, doppeltes `wait-on`.

### Server und Daten
- Share-Codes: Token nur als Text, Ratenbegrenzung (10 pro Minute und IP), Access-Filter behoben.
- Journal: Nummern-Sperre beim Anlegen, 404 statt 500, Unit-Tests.
- Karten-Status: keine verlorenen Änderungen, Persist-Timer zusammengeführt, `maplayer.ts` aufgeteilt.
- 500er bei unbekannten IDs behoben.

### Abhängigkeiten und Tooling
- Strapi 5.63.0, Node 26, Python 3.15, glob 14.0.6.
- Deprecations, die über Strapi-Updates laufen, sind als erledigt markiert.
- Changelog `zskarte/CHANGELOG.md` mit Eintrag 7.0.0 (ohne Backticks).

### Audit 1 (abgeschlossen)
- Zeilenenden, Named Volumes, Health-Checks, `.env`-Bootstrap, Node/Python-Upgrades.
- Befunde 1 bis 18 des ersten Audits: umgesetzt außer 6 (XSS, offen) und 8 (Tests nur teilweise, offen: Journal-Nummern und Karten-Status sind getestet, Token-Typ-Check ebenfalls über Unit-Tests abgedeckt).

### Tests
- Unit-Tests (`npm run test:unit` in `packages/server`): Ratenbegrenzung, Access-Filter, Journal-Nummern, Karten-Status.
- E2E: Drawing und Journal, grün bis auf den XSS-Test und den instabilen Layer-Test „add and delete layer“.
