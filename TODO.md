# TODO

Stand: 2026-11-23. Erledigte Punkte stehen nicht mehr hier, Details stehen in der Git-Historie.

## Offen

### Sicherheit (Audit 2 und 3)
- [ ] A1. Share-Login-Ratenbegrenzung wirkt hinter Traefik für alle Nutzer gemeinsam. Fix: `proxy: true` in `packages/server/config/server.ts`, danach den 11-Versuche-Test wiederholen.
- [ ] A4. XSS über Adress-Token im Editor (`contenteditable/address-token.blot.ts:13, 15`). Fix: `textContent` statt `innerHTML`. Der Test `tests/journal-address-xss.spec.ts` schlägt bis dahin fehl.

### PDF-Druck (pdfme)
- [ ] Entscheidung: pdfme entfernen und die Standardvorlage (82 Elemente) im Code rendern (jsPDF, qrcode). Aufwand laut Einschätzung kleiner als gedacht. Referenz-PDF liegt unter `C:\Users\patrick\AppData\Local\Temp\baseline-pdfme-current-with-appurl.pdf`. Das entfernt auch die `core-js`- und `fix-esm`-Kette.

### npm-Deprecations ohne Strapi-Bezug
- [ ] `fix-esm` / `@babel/plugin-proposal-export-namespace-from`: `fix-esm` wird für `superjson` gebraucht, das reines ESM ist. Lösung nur über anderes Serialisierungspaket oder ESM-Umbau des Servers.
- [ ] `core-js@2.6.12` über `@pdfme` → `form-render` → `rc-color-picker` → `rc-trigger` 1.x → `babel-runtime` 6. Override auf core-js 3 scheitert (`core-js/library` fehlt in v3). Lösung nur über den PDF-Umbau.
- [ ] `fstream@1.0.12`, `lodash.isequal@4.5.0`: über `exceljs` (neueste Version). Lösung nur über Austausch der Excel-Bibliothek (`journal.service.ts`, `listViewEntry.ts`).

### OpenLayers-Patch
- [ ] Bei jedem Upgrade von `ol` (aktuell 10.11.0): `zskarte/patches/ol+10.11.0.patch` prüfen und neu erzeugen. Bricht der Build bei `patch-package` ab, passt der Patch nicht mehr.

### Upgrades (zu aktualisieren)
- [ ] `@pdfme/*` von 6.0.6 auf 6.2.8 aktualisieren. 6.2.x zieht über `@pdfme/converter` das Node-only-Paket `clawpdf` in den Browser-Build, der Build bricht dann ab. Mit `overrides` für `@pdfme/converter` auf 6.0.6 baut 6.2.8 durch, der PDF-Export ist damit aber noch nicht geprüft. Override in `zskarte/package.json` danach entfernen.
- [ ] `shpjs` (Server) von 5.0.2 auf 6.x aktualisieren. Der CommonJS-Einstieg von 6.x ist ein Browser-Bundle (`self` fehlt), `strapi build` bricht ab. Warten auf ESM-Umbau des Servers oder ein Release mit Node-Einstieg.
- [ ] TypeScript 7 (aktuell 6.0.3). Angular 22 verlangt TypeScript `>=6.0 <6.1`, und TypeScript 7 bietet die klassische Compiler-API nicht mehr. Erst mit einer Angular-Version, die TypeScript 7 unterstützt.
- [ ] Biome 2 aufräumen: CSS- und HTML-Lint sind aus, drei Regeln sind aus (`useIterableCallbackReturn`, `noNonNullAssertedOptionalChain`, `noInvalidUseBeforeDeclaration`). Die Regeln prüfen und wieder einschalten, wo sie passen. Der Lint der Templates (`a11y`) ist ungeprüft.
- [ ] Server-Tsconfig: TypeScript 6 meldet Deprecations (`baseUrl`, `moduleResolution: node10`) aus der Strapi-Basiskonfiguration. Vor TypeScript 7 beheben.

## Bewusst offen
- Sicherheit, vom Betreiber akzeptiert: A2 (Beispiel-Secrets in der Server-`.env` bei `zskarte.sh start`) und A6 (Passwort-Fallback `supersecret123` für die Datenbank).
- React, react-dom, react-router-dom und styled-components bleiben im Server: Strapi verlangt sie für den Admin (`strapi build` bricht ohne sie ab).
- Strapi-Warnungen (`glob@7`, `@koa/router@12`, `node-abort-controller`, `rimraf`, `inflight`, `uuid@8`): Lösung über Strapi-Updates. Strapi 5.63.0 ist das aktuelle latest.
- Upgrade-Lauf 2026-11-23: Strapi, `strapi-plugin-config-sync` und `strapi-provider-upload-azure-storage` blieben unverändert, laut Vorgabe.
- E2E „should add journal entry“ ist nicht stabil: die Zählung hängt vom Datenstand im Journal ab.
- `zskarte.bat`: bleibt vorerst. Entscheidung, ob löschen oder synchron halten.
- Strapi-Warnung `admin.auth.options.expiresIn` stammt aus Strapi-Defaults.
- `rc-color-picker` React-16-Peer-Konflikt: nicht blockierend.
- Beispiel-Passwörter (`supersecret123`, `zskarte`, `postgres2`) bleiben laut Vorgabe, Nutzer ändern sie selbst.
- Dev-Umgebung `environment.dev.ts` zeigt auf den Upstream-Testserver `api-test.zskarte.ch`.
