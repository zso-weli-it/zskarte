# TODO / offene Punkte

Arbeitsprotokoll für den autonomen Lauf (Stand 2026-11-22).

## Erledigt
- Zeilenenden: Arbeitskopie auf LF, `.gitattributes` mit `* text=auto eol=lf`, Shell-Skripte `+x`.
- `zskarte.sh start -b`: Flag wird aus `$2` gelesen.
- Postgres: offizielles `postgres:18` statt `bitnamilegacy/postgresql:16.3.0`, Named Volume `pgdata-zskarte`. Bind-Mount auf NTFS verursachte `chmod: Operation not permitted`.
- pgAdmin: `dpage/pgadmin4:9` (statt `latest`), Named Volume `pgadmin-zskarte`.
- Server bekommt `packages/server/.env` über `env_file`. `zskarte.sh start` kopiert `.env.example`, falls nicht vorhanden (`.dockerignore` schließt `.env` vom Image aus).
- `zskarte.sh start` kopiert `searchserv/search.env` und `search-db.env` aus den Beispielen, falls nicht vorhanden.
- End-to-End-Lauf in WSL mit `init` und `start -b` durchgelaufen: App 4300, Strapi 1337 (`/admin` 200), Such-API 8000 (Treffer für Aarau, Bahnhofstrasse), Tileserver 8080 (Tile 200), pgAdmin 7050.

## Annahmen
- Postgres-Datenverzeichnis `zskarte/data/postgresql` enthielt keine echten Daten (Reste des fehlgeschlagenen Laufs). Nicht migriert.
- Beispieldaten für Strapi liegen in `zskarte/packages/server/init/init.sql` (pg_dump) und werden beim ersten Start in das leere Volume geladen.
- Beispiel-Passwörter bleiben, laut Vorgabe. Nutzer ändern sie selbst.

## Offen / bekannt
- (erledigt) Such-Service wartet per depends_on auf healthy Such-DB; Pool prüft Verbindungen (check_connection).
- `docker compose` Warnungen: Build-Kontext ohne `.git` (`git rev-parse` in der App-Build-Stufe schlägt fehl, harmlos).
- `zskarte2/` ignorieren (laut Vorgabe).
- Versionsstand aller Abhängigkeiten gegen Registry prüfen (npm outdated, pip index), Upgrades nur wo nötig, bevorzugt LTS.
- Dockerfile.app nutzt `nginx:1.15.8` (2018), Dockerfile.server `node:22.14.0`, searchserv Python 3.11/3.13 gemischt.
- searchserv/Dockerfile: `apt install libpq5` ohne `apt-get update`.
- Hardcodierte Passwörter `supersecret123`, `postgres`, `postgres2`, `zskarte` nur als Beispiel. Bleiben laut Vorgabe.
- `gen-server-env.sh` existiert, könnte für echte Secrets genutzt werden. Nicht umgesetzt.

## Erledigt (Härten)
- Images gepinnt: node 22.22.0, nginx 1.29.3, postgres 18.1, python 3.13.14 (searchserv + db-init).
- searchserv: Healthcheck auf Such-DB, `depends_on: service_healthy`.
- searchserv/search.py: `check_connection` im Pool, toten `close_them`-Shutdown-Handler entfernt (referenzierte undefinierte `curs`/`conn`).
- Strapi-Warnung `admin.auth.options.expiresIn` stammt aus Strapi-Defaults, nicht aus unserer Config. Nicht behoben.

## Dependencies (Stand 2026-11-22, Registry-Check)
- Strapi 5.33.3 → 5.63.0 (gleiche Major). Versionen in root und server angepasst.
- Nur Minor/Patch-Updates per `npm update` (Wanted-Versionen). Angular bleibt 21.x (22 wäre Major).
- `zskarte/.npmrc` mit `legacy-peer-deps=true`. Grund: `styled-components` bringt optionalen Peer `react-native` mit, der mit `@types/react` 19.3 kollidiert (ERESOLVE). Dockerfiles kopieren `.npmrc` vor `npm ci`.
- Offene Majors (bewusst nicht gemacht, nur bei Bedarf): @angular 22, @pdfme 6, ngx-indexed-db 22, ngx-quill 31, ol-mapbox-style 13, jspdf 4, ts-md5 2, immer 11, uuid 14, react 19 + react-router 7 (server), file-type 22, wait-on 9, udsv 0.7, typescript 7 (common/types), shpjs 4 vs 6 (server ≠ app).
- Lockfile-Erzeugung nur in Linux-Node-22-Container. npm unter Windows bricht bei `oxide-wasm32-wasi` mit EALLOWREMOTE ab.

## Build-Fixes nach Update
- `angular.json`: Asset `../../CHANGELOG.md` entfernt (Angular verbietet Assets außerhalb des Workspace). `update-ngsw-config.js` kopiert die Datei nach `src/assets/CHANGELOG.md` (gitignored).
- TS-Fehler durch neue ol/fuse-Typen: `Fuse<JournalEntry>` explizit typisiert, `mapBrowserEvent`/`getTargetElement` mit Null-Behandlung, `reportNumber` im Template per `$any`. Die `$any`-Stelle ist ein Notbehelf, die Typen von `reportNumber` (number | number[]) sollten bereinigt werden.
- `immutable`: `redux-immutable` (Peer von strapi-plugin-config-sync) braucht immutable 3.8 an der Wurzel, `sass` braucht 5.x. Lösung: `immutable@^3.8.2` als devDependency in der Wurzel, sass behält seine eigene 5.x-Kopie. Ohne das schlägt der Strapi-Admin-Build (Vite) fehl.
- `rc-color-picker` (Strapi-Transitive) meldet einen React-16-Peer-Konflikt. Nicht blockierend, bleibt.
- Nicht reproduziert: Im Vordergrund bricht `zskarte.sh start -b` bei fehlgeschlagenem Build korrekt ab. Im Hintergrund-Wrapper wurde Exit 0 angezeigt, Ursache offen.
- Strapi-Admin-Build: Ursache für "UnsavedChangesModal is not exported" war ein veralteter `node_modules`-Ordner auf dem Windows-Dateisystem (Strapi 5.33.3 nested). Nach Löschen und Neugenerieren des Lockfiles sauber.
- `zskarte.bat` dupliziert `zskarte.sh`, fehlt aber das `.env`-Bootstrapping. Entscheidung offen: löschen (du deployst mit .sh) oder synchron halten.
- Docker: npm-Cache als BuildKit-Cache-Mount in Dockerfile.app/server (`--mount=type=cache,target=/root/.npm`).

## Audit (ponytail-audit)

### Must fix
- [x] 1. Token endpoint trusts any JSON value: `packages/server/src/api/access/controllers/access.ts:41, 47`. Reject non-string `accessToken`. (Not run yet, check with one request first.)
- [x] 2. Short share codes (6 digits, 15 min) can be guessed, no rate limit on `/accesses/auth/token` (`access.ts:118`). Add rate limit or longer codes.
- [x] 3. `access.find` replaces the organisation filter when `operationId` is given (`access.ts:136-140`). Other organisations' share entries are visible. Merge filters instead.
- [x] 4. Journal message numbers can repeat under concurrent saves (`journal-entry.ts:78-87`, `messageNumber` not unique). Add per-operation advisory lock in the transaction.
- [x] 5. Map state flag cleared after `await` loses the last edits (`state/operation.ts:145-158`). Clear the flag before the save, restore on error. (Flag vor dem Speichern gelöscht, Test: `map-state.test.ts`)
- [ ] 6. Possible script injection: `contenteditable/address-token.blot.ts:13, 15` puts `value.address` into `innerHTML`. Use `textContent`. (Not verified in a browser.)

### Should fix
- [x] 7. Two timers save the map state (`index.ts:33` every 30 s, cron every 15 s). Remove the `setInterval`. (Timer in index.ts entfernt, Cron bleibt)
- [x] 8. Tests: Access-Filter, Rate-Limit, Journal-Nummern, Map-Flag (`npm run test:unit` in packages/server, 12 Tests).
- [x] 9. `accessControl.ts:387` `entry.public` crashes on unknown IDs (500 instead of 403). Use `entry?.public`.
- [x] 10. Journal update crashes on unknown IDs (`journal-entry.ts:158, 173`). Return 404 when entry is null.
- [x] 11. Postgres (55432) and pgAdmin (7050) are published on all interfaces in `zskarte/docker-compose.yml`. Bind to `127.0.0.1`.
- [x] 12. Map state is serialised and hashed on every change (`state/operation.ts:109-111`). Compare references from `applyPatches` instead.
- [x] 13. `state/maplayer.ts` (1352 lines) mixes five jobs. Split by job, no logic change. (aufgeteilt in maplayer-shared, -boundaries, -entrances, -swiss-names, -styles; maplayer.ts re-exportiert)

### Nice to have
- [x] 14. Remove unused dependency `ngx-indexed-db` (`packages/app/package.json:51`). −1 dependency.
- [x] 15. Remove duplicate `wait-on` from `packages/app/package.json:82`. Root copy stays. −1 dependency.
- [x] 16. `zskarte.bat` duplicates `zskarte.sh` and misses the `.env` setup. Delete it or make it call the `.sh`. About −45 lines. → Entscheidung: `zskarte.bat` vorerst behalten (done)
- [x] 17. Geo index on `ortschaften` uses `double precision`, the search query casts to `real`, so the index is never used. Change the cast in `searchserv/search.py`.
- [x] 18. Search `bbox` is not validated. Non-numbers cause a 500. Check all four values are numbers.

Audit left out (smaller): socket server allows origin `*`; raw user agents in logs.
Audit lean: −60 lines, −2 dependencies possible.

## Erledigt (Tileserver-Init)
- `mapserv-init/fetch-tiles.sh`: Vor dem Download nur HEAD-Header holen (ETag, Last-Modified, Content-Length). Stimmen sie mit `tiles.mbtiles.meta` überein, wird übersprungen. Getestet: erster Lauf lädt, zweiter Lauf überspringt.
- Download in `tiles.mbtiles.part`, Größe gegen Content-Length geprüft, dann atomar umbenannt. Eine alte gute Datei bleibt bei Abbruch erhalten.

## Erledigt (Audit-Findings 1-4)
- [x] 1. Token-Endpunkt: nur Strings akzeptiert (`access.ts`).
- [x] 2. Share-Code-Ratenbegrenzung: max. 10 falsche Codes pro IP und Minute (`access.ts`, in-memory).
- [x] 3. `access.find`: Operation-Filter wird per `$and` zum Organisations-/Share-Filter addiert statt ihn zu ersetzen.
- [x] 4. Journal-Nummern: pro Operation eine Transaktions-Sperre (`pg_advisory_xact_lock`) beim Anlegen (`journal-entry.ts`). Update-Pfad noch ohne Sperre.

## Bug: Signaturen nicht setzbar über HTTP-IP (gefunden)
- [x] `state.service.ts` `refreshMapState`: `crypto.subtle.digest` wirft auf http (kein sicherer Kontext). Das brach das Öffnen der Operation ab, Signaturen erschienen nicht. Fix: direkter String-Vergleich statt Hash.
- [x] `share-dialog.component.ts:36`: `navigator.clipboard.writeText` funktioniert auf http-IP ebenfalls nicht (nur localhost/https). Offen. → Fallback über verstecktes Textfeld + `execCommand` (Fix: Zwischenablage auf http-IP)

## Finding 6 (XSS) – Test
- [ ] `zskarte/packages/app/tests/journal-address-xss.spec.ts` reproduziert den Fehler: aktuell FAILS (Payload läuft, `window.__xss === 1`). Nach dem Fix (`textContent` in `address-token.blot.ts`) muss der Test grün werden.

## Python (searchserv)
- [x] Sprung auf Python 3.14: `searchserv/Dockerfile` (`python:3.14` Build, `python:3.14-slim-trixie` Laufzeit) und `searchserv-db-init/Dockerfile` (`python:3.14-slim-bookworm`). Getestet: Such-API läuft auf 3.14.10, Loader-Image baut.
- [ ] Sprung auf Python 3.15 (nicht gemacht, eigener Schritt):
  - `python:3.15-slim-trixie` ist verfügbar (3.15.2).
  - Gepinnte Pakete haben kein Wheel für 3.15: `httptools` 0.9.0, `MarkupSafe` 3.0.4, `orjson` 3.13.0, `PyYAML` 6.0.4, `ujson` 6.1.0, `uvloop` 0.23.0, `pydantic-core` (2.46.4 hängt an `pydantic` 2.13.4, nötig ist 2.50.5 mit `pydantic` 2.14.4), `typing_extensions` 4.16.0, `pydantic-settings` 2.16.3, `typing-inspection`.
  - Vorschlag für die Pins liegt in `C:\Users\patrick\AppData\Local\Temp\py315-final.txt` (Dry-Run aufgelöst, nicht gebaut).
  - Fehlt noch: Build der Such-API auf 3.15 und Test der Endpunkte.

## Erkenntnisse Python
- Python 3.13 ist laut PEP 719 ab Oktober 2026 nur noch im Security-Modus (keine Bugfixes mehr). 3.14 ist die aktuelle Empfehlung.
- Alle Pins aus `searchserv/requirements.txt` haben Wheels für 3.14.10 (Dry-Run mit `--only-binary`).
- `searchserv-db-init/requirements.txt` war veraltet (FastAPI 0.115 und weitere Pakete, die der Loader nicht importiert). Auf `psycopg==3.3.4` reduziert, das ist die einzige Abhängigkeit des Loaders.

## npm Deprecation-Warnungen (fresh `npm ci`, 14 Pakete)
Quelle: `npm ci` im Node-22-Container. Spalte "Wer bringt es mit" zeigt den Pfad, Vorschlag zum Beheben.

- [ ] `@angular/animations@21.2.26`: deprecated. Pfad: direkt (`packages/app`). Vorschlag: Animationen auf `animate.enter`/`animate.leave` umstellen (`grep -rn "animations" packages/app/src`). Falls keine Animationen genutzt werden, Paket entfernen.
- [ ] `@angular/platform-browser-dynamic@21.2.26`: deprecated. Direkt (`packages/app`). Vorschlag: Import entfernen, `@angular/platform-browser` reicht (vorher prüfen, ob `platformBrowserDynamic` im Code vorkommt).
- [ ] `@babel/plugin-proposal-export-namespace-from@7.18.9`: über `fix-esm@1.0.1` (root). Vorschlag: `fix-esm` prüfen, ob es noch gebraucht wird (`grep -rn fix-esm`). Sonst entfernen.
- [ ] `@koa/router@12.0.2`: über `@strapi/core` und `@strapi/types`. Upstream-Abhängigkeit von Strapi. Vorschlag: auf Strapi-Update warten; alternativ per `overrides` auf 15.x testen (Risiko, Strapi-Tests nötig).
- [ ] `core-js@2.6.12`: über `@pdfme/common` → `form-render` → `rc-color-picker` → `rc-trigger`. Vorschlag: `overrides` für `core-js@^3` testen, oder `@pdfme`-Update prüfen.
- [ ] `fstream@1.0.12`: über `exceljs@4.4.0` → `unzipper`. Vorschlag: `exceljs` ist die letzte Version, Alternative prüfen (z. B. `xlsx` oder Ersatz für den Export). Nur für den Excel-Export relevant.
- [ ] `glob@7.2.3` und `glob@11.1.0`: glob 7 über Strapi-Admin (`react-query` 3, `broadcast-channel`, `rimraf`). Vorschlag: Strapi-Update; glob 11 ist auch direkt im root (`devDependencies`), dort auf aktuelle Version prüfen.
- [ ] `inflight@1.0.6`: über `glob@7`. Speicherleck laut Warnung. Vorschlag: mit `glob`-Update verschwinden.
- [ ] `rimraf@2.7.1` und `rimraf@3.0.2`: über Strapi-Admin (`broadcast-channel`) und Build-Tools. Vorschlag: Strapi-Update.
- [ ] `lodash.isequal@4.5.0`: über `exceljs` → `fast-csv` → `@fast-csv/format`. Vorschlag: mit `exceljs`-Entscheidung klären.
- [ ] `node-abort-controller@3.1.1`: über `@strapi/strapi` → `fork-ts-checker-webpack-plugin`. Upstream. Vorschlag: Strapi-Update.
- [ ] `uuid@8.3.2`: über `sockjs` (webpack-dev-server, nur Strapi-Admin-Entwicklung). Vorschlag: nicht im Produktionsbild, Strapi-Update abwarten.

Für Strapi-Warnungen gilt: nur mit einem Strapi-Versionssprung oder gezielten `overrides` lösbar. Die Entscheidung liegt beim Upgrade-Plan, nicht bei einzelnen Paketen.

## Node.js-Version
Geprüft mit frischem `npm ci --ignore-scripts` im jeweiligen Node-Container:
- Node 22.22 (npm 10.9): Exit 0, 14 verschiedene deprecated Pakete.
- Node 24.15 (npm 11.12): Exit 0, keine Engine-Fehler, 19 deprecated-Zeilen.
- Node 26.13 (npm 11.20): Exit 0, keine Engine-Fehler, 19 deprecated-Zeilen.

Engine-Ranges: Strapi 5.63 erlaubt `>=22.0.0 <=26.x`, Angular 21 verlangt `^20.19 || ^22.12 || >=24`. Node 24 und 26 liegen damit in beiden Ranges.

- [ ] Empfehlung: Sprung auf Node 24 LTS (`node:24-bookworm-slim` bzw. `node:24-bookworm` für den App-Build). Node 22 bleibt Maintenance, das Ende ist 2027.
- [ ] Node 26 als späterer Schritt, sobald Strapi und Angular es in der Praxis mit Build und Tests bestätigt haben. Die LTS-Einstufung von Node 26 vorher prüfen.
- [ ] Vor dem Sprung: `npm run lint` und `npm run build` für App und Server im neuen Image, plus E2E-Tests.
