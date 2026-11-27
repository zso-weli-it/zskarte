# Security-Verbesserungen: Vorher/Nachher

Stand: 2026-11-27 (Nachtrag: Strapi 5.64.0 und Code-Audit, siehe unten). Frühere Stände: 2026-11-23 (Upgrade-Lauf). Befunde pip-audit ohne Duplikate (je Dienst, Paket und Advisory). Vergleich: Commit `6947bc4` (Stand vor den Audit-Arbeiten) gegen HEAD `5e1c97f` (Stand 2026-11-23).

## Zusammenfassung

Die Lockfile-Abhängigkeiten sind deutlich sicherer geworden. Container-Images sind nicht erfasst (siehe Geltungsbereich). Gemessen mit `npm audit` (Node-Abhängigkeiten der App und des Servers) und `pip-audit` (Python-Dienste der Suche).

| Bereich | Vorher | Nachher |
|---|---|---|
| npm, Advisory-Paare critical / high / moderate / low | 14 / 156 / 200 / 43 | 0 / 8 / 15 / 3 |
| npm, Advisory-Paare gesamt | 413 | 26 |
| pip, Suche (`searchserv`) | 6 Befunde | 6 Befunde (unverändert) |
| pip, Loader (`searchserv-db-init`) | 27 Befunde | 0 Befunde |

- **npm behoben:** 369 Paket-Advisory-Paare, davon 362 eindeutige GHSA-IDs, die nicht mehr in der Ergebnisliste stehen. Im Upgrade-Lauf vom 2026-11-23 kamen 21 weitere Paare dazu (jsPDF, @modelcontextprotocol/sdk, picomatch, pacote, ajv), siehe eigener Abschnitt.
- **npm offen:** 23 Paare (Stand 2026-11-23), keine critical mehr. Offen sind u. a. adm-zip, vite, zod, react-router, uuid, glob, minimatch und quill.
- **npm neu:** 3 Paare. Zwei davon stammen aus der früheren Ergänzung, `GHSA-hq66` (pdfjs-dist) kam mit dem pdfme-Upgrade auf 6.0.6 dazu.
- **pip offen:** Die Suche pinnt weiterhin `anyio`, `certifi` und `dnspython` in verwundbaren Versionen, obwohl für alle drei Fixes existieren. Der Loader hat keine Befunde mehr.

## Methode und Grenzen

- **npm:** `npm audit --package-lock-only` auf `zskarte/package-lock.json` (vorher aus `6947bc4`, nachher aus HEAD). Die Advisory-Datenbank ist die von heute, nicht die von damals.
- **CVE-IDs:** aus der OSV-API (`api.osv.dev`), Feld `aliases`. Advisories ohne CVE-Alias stehen mit `–`.
- **pip:** `pip-audit` in den Python-Images, die die Dockerfiles verwenden (`python:3.13.14` und `python:3.11-slim-bookworm` vorher, `python:3.15` und `python:3.15-slim-bookworm` nachher). Der Lauf im Windows-Host scheiterte an `uvloop`, deshalb im Container.
- **Gegenprobe:** OSV direkt auf den Baseline-Lockfile (2482 Pakete) liefert 402 Advisories mit 400 CVE-IDs, dieselbe Menge wie `npm audit`. Die ältesten Treffer sind von Mai 2024.

### Geltungsbereich

Der Report deckt nur die Abhängigkeiten ab, die in den Lockfiles stehen: npm (`zskarte/package-lock.json`) und pip (`searchserv`, `searchserv-db-init`). Alte CVEs (2019–2023) fehlen deshalb, weil die betroffenen Versionen nicht mehr im Lockfile stehen. Das ist korrekt und kein Scan-Fehler.

**Nicht geprüft:**
- Container-Images (Basis- und Laufzeit-Images, OS-Pakete darin): `postgres:18.1`, `postgis/postgis:18-3.6`, `dpage/pgadmin4:9`, `maptiler/tileserver-gl`, `alpine:latest`, `curlimages/curl`, Node- und Python-Images, die eigenen Images `zskarte-server-zskarte` und `offlinekarte-offlinekarte-search`. Hier sind alte CVEs aus OS-Paketen zu erwarten. Ein Image-Scan steht aus.
- nginx und Betriebssystem des Hosts.
- Befunde im eigenen Code haben keine CVE-IDs. Die offenen Punkte stehen unten unter „Offene Punkte aus dem Code“ (A1–A11 aus `TODO.md`).

## Nachtrag 2026-11-27: Strapi 5.64.0 und Code-Audit

Stand: 2026-11-27. Vergleich: `6947bc4` (vor den Audit-Arbeiten) gegen den Lockfile-Stand von `feb9f92` (Strapi-Upgrade). Beide Seiten sind mit derselben Advisory-Datenbank vom 2026-11-27 gemessen (`npm audit --package-lock-only`). Deshalb weichen die Zahlen für `6947bc4` von der Tabelle oben ab: seit 2026-11-23 sind neue Advisories dazugekommen.

| Bereich | Vorher (`6947bc4`) | Nachher (`feb9f92`) |
|---|---|---|
| npm, Advisory-Paare critical / high / moderate / low | 14 / 187 / 222 / 49 | 0 / 8 / 15 / 3 |
| npm, Advisory-Paare gesamt | 472 | 26 |
| npm, betroffene Pakete gesamt | 169 | 32 |
| pip | nicht neu gemessen, siehe unten | nicht neu gemessen |

### Strapi-Upgrade 5.63.0 auf 5.64.0

- Core und `@strapi/plugin-users-permissions` wurden auf 5.64.0 gehoben. `strapi-plugin-config-sync` und `strapi-provider-upload-azure-storage` blieben unverändert.
- Die Liste der 26 Advisory-Paare ist vor und nach dem Upgrade gleich. Das Upgrade schließt also keinen Befund.
- Sieben Strapi-Pakete (`@strapi/cloud-cli`, `database`, `generators`, `openapi`, `permissions`, `provider-upload-local`, `utils`) gelten nicht mehr als betroffen. Sie hingen über `zod` an einem verwundbaren Paket. Deshalb sank die Zahl der betroffenen Pakete von 39 auf 32.
- Die verbleibende Strapi-Warnung kommt nur über `zod` 3.25.76. Dieses Paket ziehen `koa-body` und `koa-session` aus dem Strapi-Core. Es gibt kein eigenes Advisory für Strapi. Die Lösung liegt bei einem Strapi-Update, siehe TODO.md.
- Pip ist nicht neu gemessen. Die Abhängigkeiten der Suche haben sich nicht geändert, die Befunde aus dem Abschnitt „pip“ bleiben gültig.

### Offene npm-Advisories (Stand 2026-11-27, 26 Paare)

| Schwere | Paket | Betroffene Version | GHSA | Titel |
|---|---|---|---|---|
| high | adm-zip | <0.6.0 | GHSA-xcpc-8h2w-3j85 | adm-zip: Crafted ZIP file triggers 4GB memory allocation |
| high | adm-zip | <0.6.1 | GHSA-7q85-xj36-vmfc | adm-zip: Uncontrolled memory allocation via the declared uncompressed size (DoS) |
| high | adm-zip | <=0.6.0 | GHSA-rcw4-f5rp-g42v | adm-zip: Decompression-bomb protection (fix for CVE-2026-39244) can be bypassed by declaring uncompressed size as 0 |
| high | adm-zip | <=0.6.0 | GHSA-j5f4-cc29-5x44 | adm-zip extraction preserves SUID/SGID bits from untrusted ZIPs -> local privilege escalation |
| high | adm-zip | <=0.6.0 | GHSA-8238-w5pm-2374 | adm-zip: Unhandled error event in async DEFLATE decompression crashes Node.js process (DoS) |
| high | pdfjs-dist | >=5.6.83 <6.2.108 | GHSA-hq66-cqwq-w95j | PDF.js: Arbitrary JavaScript execution upon opening a malicious PDF  |
| high | vite | <=6.4.3 | GHSA-587h-7wmj-h5pm | launch-editor: `fs.existsSync()` existence check can be bypassed on Windows |
| high | zod | <4.6.6 | GHSA-mrhx-c7xc-m3w5 | Zod can exhaust memory while validating oversized constrained collections |
| moderate | @hono/node-server | >=1.19.10 <2.1.3 | GHSA-rmxm-3fg6-px4f | @hono/node-server: `serveStatic` decodes the request path a second time, leading to bypass of middleware on static paths |
| moderate | adm-zip | >=0.5.9 <=0.6.0 | GHSA-vwc7-r8mq-g2x9 | adm-zip extraction follows destination symlinks, allowing arbitrary file overwrite |
| moderate | adm-zip | <=0.6.0 | GHSA-p634-w6r4-rjp2 | adm-zip: Duplicate ZIP entry names: getEntry() and extractAllTo() resolve to different content |
| moderate | adm-zip | <=0.6.0 | GHSA-c6fg-446q-cg94 | adm-zip: getDataAsync() bypasses the maxOutputLength size guard enforced by the synchronous getData() path |
| moderate | glob | >=9.0.0 <=14.0.1 | GHSA-3g3m-2fjr-6pw4 | Glob: AbortSignal cancellation bypass allows post-timeout filesystem traversal |
| moderate | minimatch | >=7.0.0 <11.0.1 | GHSA-g3hv-75wg-m249 | minimatch has potential denial of service via globparts amplification |
| moderate | react-router | >=6.0.0 <7.18.0 | GHSA-wrjc-x8rr-h8h6 | React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass) |
| moderate | react-router | >=6.4.0 <7.18.0 | GHSA-337j-9hxr-rhxg | React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration |
| moderate | uuid | <11.1.1 | GHSA-w5hq-g745-h8pq | uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided |
| moderate | vite | <=6.4.1 | GHSA-4w7w-66w2-5vf9 | Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling |
| moderate | vite | <=6.4.2 | GHSA-v6wh-96g9-6wx3 | launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows |
| moderate | vite | <=6.4.3 | GHSA-698v-4r3x-3vcv | launch-editor: escapeCmdArgs() omits % escaping on Windows |
| moderate | vite | <=6.4.3 | GHSA-r825-w8mm-5pxw | launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors |
| moderate | vite | <=6.4.3 | GHSA-rq7h-c2jc-7f22 | Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine |
| moderate | vite | <=6.4.2 | GHSA-fx2h-pf6j-xcff | vite: `server.fs.deny` bypass on Windows alternate paths |
| low | esbuild | >=0.27.3 <0.28.1 | GHSA-g7r4-m6w7-qqqr | esbuild allows arbitrary file read when running the development server on Windows |
| low | quill | =2.0.3 | GHSA-v3m3-f69x-jf25 | Quill is vulnerable to XSS via HTML export feature |
| low | vite | <=6.4.3 | GHSA-9jrq-w75r-8gcw | Vite: Cross origin script execution through Vite custom middleware |

### Sicherheitsrelevante Änderungen aus dem Code-Audit (Version 7.0.9)

- **Freigabe-Links:** Ein gelöschter Link sperrt jetzt das Login-Token, den Refresh und offene Socket-Verbindungen. Vorher blieb ein Token bis zu 30 Tage gültig (`25e89cf`).
- **Kartenänderungen:** Andere Nutzer bekommen nur Änderungen, die der Server übernommen hat (`f6725ec`).
- **Freigabetyp „all“:** Der Typ wurde entfernt. Er ließ sich anlegen, aber nie nutzen (`11c5725`).
- **Standort:** Der Breitengrad wird geprüft. Vorher wurde nur die Länge zweimal geprüft (`91cee7b`).
- **Zugriffsregeln:** Tests prüfen Freigabe-Links auf fremde Operationen, gelöschte Links und Anfragen ohne Anmeldung (`2eb5a2f`).
- **Suche:** Die Escape-Zeichen für `LIKE` stehen jetzt in Raw-Strings. Das verhindert Warnungen und künftige Fehler (`4489bb0`).

### Prüfung nach dem Upgrade

- Server-Unit-Tests: 83 von 83 bestanden. Typprüfung: ohne Fehler.
- Produktionsbuild des Servers und der App: erfolgreich. Der lokale Build der App brauchte einen vorherigen Lauf von `write-environment.js`, siehe TODO.md.
- Lokaler Start mit Strapi 5.64.0: Die API antwortet, die Anmeldung funktioniert. Ein Freigabe-Link ist vor dem Löschen nutzbar (200). Nach dem Löschen liefern Zugriff und Refresh 401.
- Der Suchdienst lief im Container und beantwortete Suchen. Der Zugriff über den Host-Port war auf diesem Rechner gesperrt.
- Nicht geprüft: die Playwright-Tests, die Socket-Trennung bei einem Widerruf im Live-Betrieb und die Container-Images.

## npm: behobene Advisories (369 Paare)

| CVE | GHSA | Schwere | Paket | Betroffene Version | Titel |
|---|---|---|---|---|---|
| CVE-2026-1774 | GHSA-x9vf-53q3-cvx6 | critical | @casl/ability | >=2.4.0 <=6.7.4 | CASL Ability is Vulnerable to Prototype Pollution |
| CVE-2026-27886 | GHSA-rjg2-95x7-8qmx | critical | @strapi/strapi | >=4.0.0 <5.37.0 | Strapi may leak sensitive data via relational filtering due to lack of query sanitization |
| CVE-2026-25896 | GHSA-m7jm-9gc2-mpf2 | critical | fast-xml-parser | >=5.0.0 <5.3.5 | fast-xml-parser has an entity encoding bypass via regex injection in DOCTYPE entity names |
| CVE-2026-110634 | GHSA-6wfj-92cw-88vg | critical | git-diff | <2.0.7 | git-diff: OS command injection vulnerability via crafted strings to the gitDiff API |
| CVE-2026-33937 | GHSA-2w6w-674q-4c4q | critical | handlebars | >=4.0.0 <=4.7.8 | Handlebars.js has JavaScript Injection via AST Type Confusion |
| CVE-2026-106446 | GHSA-8r5x-fm3f-whwj | critical | handlebars | >=4.0.0 <=4.7.9 | Handlebars: JavaScript Injection via AST Type Confusion in compile (bypass of CVE-2026-33937) |
| CVE-2026-106445 | GHSA-p8wg-vrv2-v86f | critical | handlebars | >=3.0.0 <=4.7.9 | Handlebars: JavaScript Injection via Own Property Check Bypass |
| CVE-2026-102992 | GHSA-67c8-pqhq-4rmx | critical | piscina | >=5.0.0 <5.3.2 | piscina: Prototype-pollution gadget in ThreadPool.options allows RCE via execArgv / loadBalancer / env |
| CVE-2026-90711 | GHSA-jqcg-44mw-7w3h | critical | proxy-addr | >=1.1.0 <2.0.8 | proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet |
| CVE-2026-9277 | GHSA-w7jw-789q-3m8p | critical | shell-quote | >=1.1.0 <=1.8.3 | shell-quote quote() does not escape newlines in object .op values |
| CVE-2026-59873 | GHSA-23hp-3jrh-7fpw | critical | tar | <=7.5.18 | node-tar: Decompression/parse DoS via unlimited input |
| CVE-2026-54466 | GHSA-xv26-6w52-cph6 | critical | websocket-driver | <0.7.5 | websocket-driver: Message corruption via abuse of protocol length headers |
| CVE-2026-54266 | GHSA-39pv-4j6c-2g6v | high | @angular/common | >=21.0.0-next.0 <21.2.17 | @angular/common: Weak 32-Bit Cache Key Hashing in `HttpTransferCache` Leading to Cross-Request Data Leakage and State Poisoning |
| CVE-2026-54268 | GHSA-48r7-hpm6-gfxm | high | @angular/common | >=21.0.0-next.0 <21.2.17 | @angular/common: Denial of Service (DoS) via OOM in Date Formatting (formatDate) |
| CVE-2026-68945 | GHSA-jhpw-976m-542j | high | @angular/common | >=21.0.0-next.0 <21.2.19 | Angular: Cache-Key Ambiguity in HttpTransferCache Leading to Cross-Request Response Reuse and State Poisoning |
| CVE-2026-50171 | GHSA-p3vc-36g9-x9gr | high | @angular/common | >=21.0.0-next.0 <21.2.15 | @angular/common: Denial of Service (DoS) via OOM in Number Formatting (digitsInfo) |
| CVE-2026-50170 | GHSA-q6f4-qqrg-jv6x | high | @angular/common | >=21.0.0-next.0 <21.2.15 | @angular/common: Information Leak via Default Caching of Credentialed Requests in HttpTransferCache |
| CVE-2026-32635 | GHSA-g93w-mfhg-p222 | high | @angular/compiler | >=21.0.0-next.0 <21.2.4 | Angular vulnerable to XSS in i18n attribute bindings |
| CVE-2026-69151 | GHSA-jj27-h5hq-8x99 | high | @angular/compiler | >=21.0.0-next.0 <21.2.19 | Angular i18n: Cross-Site Scripting (XSS) via event-handler attributes |
| CVE-2026-32635 | GHSA-g93w-mfhg-p222 | high | @angular/core | >=21.0.0-next.0 <21.2.4 | Angular vulnerable to XSS in i18n attribute bindings |
| CVE-2026-69151 | GHSA-jj27-h5hq-8x99 | high | @angular/core | >=21.0.0-next.0 <21.2.19 | Angular i18n: Cross-Site Scripting (XSS) via event-handler attributes |
| CVE-2026-27970 | GHSA-prjf-86w9-mfqv | high | @angular/core | >=21.0.0-next.0 <=21.1.5 | Angular i18n vulnerable to Cross-Site Scripting |
| CVE-2026-54267 | GHSA-rgjc-h3x7-9mwg | high | @angular/core | >=21.0.0-next.0 <21.2.17 | Angular Client Hydration DOM Clobbering & Response-Cache Poisoning |
| CVE-2026-111752 | GHSA-62vg-58rm-qff7 | high | @angular/router | >=21.0.0 <21.2.25 | @angular/router: Denial of Service via Unmatched Empty-Path Outlet Route Matching in Server-Side Rendering (SSR) |
| CVE-2026-101896 | GHSA-ff3f-86qr-9cv3 | high | @angular/router | >=21.0.0 <21.2.24 | Angular Server-Side Rendering (SSR): Denial of Service via Numeric URL Matrix Parameters |
| CVE-2026-54264 | GHSA-qxh6-94w6-9r5p | high | @angular/service-worker | >=21.0.0-next.0 <21.2.17 | @angular/service-worker: Sensitive Header Leakage on Cross-Origin Redirects in Angular Service Worker |
| CVE-2026-44728 | GHSA-fv7c-fp4j-7gwp | high | @babel/plugin-transform-modules-systemjs | >=7.12.0 <=7.29.3 | @babel/plugin-transform-modules-systemjs generates arbitrary code when compiling malicious input |
| CVE-2026-29087 | GHSA-wc8c-qw6v-h7f6 | high | @hono/node-server | <1.19.10 | @hono/node-server has authorization bypass for protected static paths via encoded slashes in Serve Static Middleware |
| CVE-2026-25547 | GHSA-7h2j-956f-4vf2 | high | @isaacs/brace-expansion | <=5.0.0 | @isaacs/brace-expansion has Uncontrolled Resource Consumption |
| CVE-2026-44494 | GHSA-35jp-ww65-95wh | high | axios | >=1.0.0 <1.16.0 | axios Vulnerable to Full Man-in-the-Middle via Prototype Pollution Gadget in `config.proxy` |
| CVE-2026-44495 | GHSA-3g43-6gmg-66jw | high | axios | >=1.0.0 <1.15.2 | axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge |
| CVE-2026-25639 | GHSA-43fc-jf86-j433 | high | axios | >=1.0.0 <=1.13.4 | Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig |
| CVE-2026-42035 | GHSA-6chq-wfr3-2hj9 | high | axios | >=1.0.0 <1.15.1 | Axios: Header Injection via Prototype Pollution |
| CVE-2026-44488 | GHSA-777c-7fjr-54vf | high | axios | >=1.7.0 <1.16.0 | Allocation of Resources Without Limits or Throttling in Axios |
| CVE-2026-44496 | GHSA-hfxv-24rg-xrqf | high | axios | >=1.0.0 <1.16.0 | Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection |
| CVE-2026-44486 | GHSA-j5f8-grm9-p9fc | high | axios | >=1.0.0 <1.16.0 | Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection |
| CVE-2026-44487 | GHSA-p92q-9vqr-4j8v | high | axios | >=1.0.0 <1.16.0 | Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter |
| CVE-2026-42033 | GHSA-pf86-5x62-jrwf | high | axios | >=1.0.0 <1.15.1 | Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking |
| CVE-2026-42043 | GHSA-pmwg-cvhr-8vh7 | high | axios | >=1.0.0 <1.15.1 | Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Axios 1.15.0 |
| CVE-2026-42264 | GHSA-q8qp-cvcw-x6jj | high | axios | >=1.0.0 <1.15.2 | Axios has prototype pollution read-side gadgets in HTTP adapter that allow credential injection and request hijacking |
| CVE-2026-111181 | GHSA-27r3-jxmh-p828 | high | body-parser | >=2.0.0 <2.4.0 | body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body |
| CVE-2026-13149 | GHSA-3jxr-9vmj-r5cp | high | brace-expansion | <1.1.16 | brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups |
| CVE-2026-102276 | GHSA-6j4f-fj2g-mc7p | high | brace-expansion | >=2.0.0 <2.1.5 | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion |
| CVE-2026-14257 | GHSA-mh99-v99m-4gvg | high | brace-expansion | >=2.0.0 <2.1.3 | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash |
| CVE-2026-102278 | GHSA-qhr7-859c-m2p7 | high | brace-expansion | >=2.0.0 <2.1.6 | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion |
| CVE-2026-69152 | GHSA-rgw5-rvv9-x895 | high | brace-expansion | <1.1.18 | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation |
| CVE-2026-73088 | GHSA-73wf-gq98-2v4g | high | browserslist | <=4.28.6 | Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) |
| CVE-2026-73089 | GHSA-c83g-rgw3-j3cx | high | browserslist | <=4.28.6 | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM |
| CVE-2026-87776 | GHSA-vc2v-76pw-4v95 | high | compression | <1.8.2 | compression vulnerable to Denial of Service via memory leak on premature response close |
| CVE-2026-102599 | GHSA-2gc4-cqfq-p2gv | high | engine.io | >=6.6.0 <6.6.10 | Socket.IO: Engine.IO Protocol Revision Mismatch DoS |
| CVE-2026-59724 | GHSA-gr94-w7qr-f4j3 | high | engine.io | >=6.5.0 <6.6.7 | Socket.IO: Engine.IO WebTransport SID DoS |
| CVE-2026-59725 | GHSA-r635-g3xr-vw7x | high | engine.io | >=4.1.0 <6.6.7 | Socket.IO: Engine.IO Polling Transport Connection Exhaustion |
| CVE-2026-13676 | GHSA-4c8g-83qw-93j6 | high | fast-uri | >=3.0.0 <3.1.3 | fast-uri vulnerable to host confusion via failed IDN canonicalization |
| CVE-2026-18446 | GHSA-7p8r-x3mc-p8w7 | high | fast-uri | >=3.0.0 <3.1.5 | fast-uri vulnerable to host confusion via backslash authority introducer |
| CVE-2026-75975 | GHSA-f65p-4m7j-42xc | high | fast-uri | >=3.0.0 <3.1.6 | fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization |
| CVE-2026-76172 | GHSA-jqff-g426-hqxp | high | fast-uri | >=3.0.0 <3.1.6 | fast-uri vulnerable to host confusion via percent-encoded scheme normalization |
| CVE-2026-6321 | GHSA-q3j6-qgpj-74h6 | high | fast-uri | >=3.0.0 <=3.1.0 | fast-uri vulnerable to path traversal via percent-encoded dot segments |
| CVE-2026-84292 | GHSA-qw65-cvwx-89v3 | high | fast-uri | >=3.0.0 <3.1.7 | fast-uri vulnerable to authority injection via an unvalidated port in serialize |
| CVE-2026-16221 | GHSA-v2hh-gcrm-f6hx | high | fast-uri | >=3.0.0 <=3.1.3 | fast-uri vulnerable to host confusion via literal backslash authority delimiter |
| CVE-2026-6322 | GHSA-v39h-62p7-jpjc | high | fast-uri | >=3.0.0 <=3.1.1 | fast-uri vulnerable to host confusion via percent-encoded authority delimiters |
| CVE-2026-25128 | GHSA-37qj-frw5-hhjh | high | fast-xml-parser | >=5.0.9 <=5.3.3 | fast-xml-parser has RangeError DoS Numeric Entities Bug |
| CVE-2026-33036 | GHSA-8gc5-j5rx-235r | high | fast-xml-parser | >=5.0.0 <5.5.6 | fast-xml-parser affected by numeric entity expansion bypassing all entity expansion limits (incomplete fix for CVE-2026-26278) |
| CVE-2026-26278 | GHSA-jmr7-xgp7-cmfj | high | fast-xml-parser | >=5.0.0 <5.3.6 | fast-xml-parser affected by DoS through entity expansion in DOCTYPE (no expansion limit) |
| CVE-2026-32141 | GHSA-25h7-pfq9-p65f | high | flatted | <3.4.0 | flatted vulnerable to unbounded recursion DoS in parse() revive phase |
| CVE-2026-33228 | GHSA-rf6f-7fwh-wjgh | high | flatted | <=3.4.1 | Prototype Pollution via parse() in NodeJS flatted |
| CVE-2026-12143 | GHSA-hmw2-7cc7-3qxx | high | form-data | >=4.0.0 <4.0.6 | form-data: CRLF injection in form-data via unescaped multipart field names and filenames |
| CVE-2025-64756 | GHSA-5j98-mcp5-4vw2 | high | glob | >=10.2.0 <10.5.0 | glob CLI: Command injection via -c/--cmd executes matches with shell:true |
| CVE-2026-33938 | GHSA-3mfm-83xf-c92r | high | handlebars | >=4.0.0 <=4.7.8 | Handlebars.js has JavaScript Injection via AST Type Confusion by tampering @partial-block |
| CVE-2026-33939 | GHSA-9cx6-37pm-9jff | high | handlebars | >=4.0.0 <=4.7.8 | Handlebars.js has Denial of Service via Malformed Decorator Syntax in Template Compilation |
| CVE-2026-33940 | GHSA-xhpv-hc6g-r9c6 | high | handlebars | >=4.0.0 <=4.7.8 | Handlebars.js has JavaScript Injection via AST Type Confusion when passing an object as dynamic partial |
| CVE-2026-33941 | GHSA-xjpj-3mr7-gcpf | high | handlebars | >=4.0.0 <=4.7.8 | Handlebars.js has JavaScript Injection in CLI Precompiler via Unescaped Names and Options |
| CVE-2026-54290 | GHSA-88fw-hqm2-52qc | high | hono | <4.12.25 | hono: CORS Middleware reflects any Origin with credentials when `origin` defaults to the wildcard |
| CVE-2026-29045 | GHSA-q5qw-h33p-qvwr | high | hono | <4.12.4 | Hono vulnerable to arbitrary file access via serveStatic vulnerability |
| CVE-2026-55603 | GHSA-gcq2-9pq2-cxqm | high | http-proxy-middleware | >=3.0.4 <3.0.7 | http-proxy-middleware: multipart/form-data field injection via unescaped CRLF in `fixRequestBody` |
| CVE-2026-59879 | GHSA-v56q-mh7h-f735 | high | immutable | >=5.0.0-beta.1 <5.1.8 | Immutable.js `List` 32-bit trie overflow → unrecoverable DoS |
| CVE-2026-29063 | GHSA-wf6x-7x77-mvgw | high | immutable | >=5.0.0 <5.1.5 | Immutable is vulnerable to Prototype Pollution |
| CVE-2026-59880 | GHSA-xvcm-6775-5m9r | high | immutable | <3.8.4 | Immutable: Hash-collision algorithmic complexity denial of service in Immutable.Map/Set |
| CVE-2026-69192 | GHSA-mwp4-54f8-5fhr | high | ip-address | <=10.3.0 | ip-address: Address4 decodes leading-zero octets as decimal while resolvers decode them as octal, allowing SSRF and trust-boundary bypass |
| CVE-2026-118772 | GHSA-4528-x5fx-h6hg | high | joi | >=18.0.0 <18.3.1 | joi: quadratic-time split in `string().email({ multiple: true })` allows denial of service |
| CVE-2026-92599 | GHSA-6h2x-m376-mqjq | high | joi | >=18.0.0 <18.2.6 | joi: Quadratic regular-expression backtracking in `Joi.string().isoDate()` |
| CVE-2026-46625 | GHSA-qjx8-664m-686j | high | js-cookie | <=3.0.5 | JavaScript Cookie: Per-instance prototype hijack in assign() enables cookie-attribute injection |
| CVE-2026-84375 | GHSA-2883-xcg3-v3hh | high | js-yaml | >=4.0.0 <4.3.2 | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources |
| CVE-2026-59869 | GHSA-52cp-r559-cp3m | high | js-yaml | >=3.0.0 <3.15.0 | js-yaml: YAML merge-key chains can force quadratic CPU consumption |
| – | GHSA-5p4m-2wfm-xmqj | high | js-yaml | >=4.0.0 <4.3.1 | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported |
| CVE-2026-27959 | GHSA-7gcc-r8m5-44qm | high | koa | <2.16.4 | Koa has Host Header Injection via ctx.hostname |
| CVE-2026-112942 | GHSA-587h-7wmj-h5pm | high | launch-editor | <=2.14.1 | launch-editor: `fs.existsSync()` existence check can be bypassed on Windows |
| CVE-2026-48801 | GHSA-22p9-wv53-3rq4 | high | linkify-it | <=5.0.0 | LinkifyIt#match scan loop has quadratic algorithmic complexity |
| CVE-2026-59887 | GHSA-v245-v573-v5vm | high | linkify-it | <=5.0.1 | linkify-it: Quadratic-complexity DoS via the `mailto:` validator scan-loop on attacker text |
| CVE-2026-4800 | GHSA-r5fr-rjxr-66jc | high | lodash | >=4.0.0 <=4.17.23 | lodash vulnerable to Code Injection via `_.template` imports key names |
| CVE-2026-4800 | GHSA-r5fr-rjxr-66jc | high | lodash-es | >=4.0.0 <=4.17.23 | lodash vulnerable to Code Injection via `_.template` imports key names |
| CVE-2026-111759 | GHSA-r7fv-28h4-cvq7 | high | markdown-it | <14.3.2 | markdown-it: Quadratic complexity in smartquotes with unmatched closing quotes |
| CVE-2026-27904 | GHSA-23c5-xmqv-rm74 | high | minimatch | >=10.0.0 <10.2.3 | minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions |
| CVE-2026-26996 | GHSA-3ppc-4f35-3m26 | high | minimatch | >=10.0.0 <10.2.1 | minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern |
| CVE-2026-27903 | GHSA-7r86-cg39-jmmj | high | minimatch | >=10.0.0 <10.2.3 | minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments |
| CVE-2026-67214 | GHSA-28wg-ghj8-5hjv | high | nanoid | <3.3.16 | nanoid: non-secure generators can loop indefinitely with negative size |
| CVE-2026-67213 | GHSA-2v37-7h3g-55p8 | high | nanoid | <3.3.18 | nanoid: custom generators can loop indefinitely when size is zero |
| CVE-2026-73086 | GHSA-xwg4-73v4-xw9w | high | nanoid | <3.3.12 | nanoid: Integer Overflow or Wraparound |
| CVE-2026-33896 | GHSA-2328-f5f3-gj25 | high | node-forge | <=1.3.3 | Forge has a basicConstraints bypass in its certificate chain verification (RFC 5280 violation) |
| CVE-2026-33891 | GHSA-5m6q-g25r-mvwx | high | node-forge | <1.4.0 | Forge has Denial of Service via Infinite Loop in BigInteger.modInverse() with Zero Input |
| CVE-2026-119190 | GHSA-5x38-2vff-x55p | high | node-forge | <=1.4.0 | Forge: X.509 basicConstraints bypass in verifyCertificateChain() via deprecated extension OIDs 2.5.29.10 and 2.5.29.13 |
| CVE-2026-119192 | GHSA-6qrw-m8cv-hcxf | high | node-forge | <=1.4.0 | Forge: RSA PKCS#1 v1.5 signature forgery via non-canonical DigestInfo encoding |
| CVE-2026-118779 | GHSA-7wch-p9px-956x | high | node-forge | <=1.4.0 | Forge: Regular expression denial of service in PEM decoding (pem.decode) |
| CVE-2026-85393 | GHSA-86w9-cpqp-85rv | high | node-forge | <=1.4.0 | node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements |
| CVE-2026-119188 | GHSA-8hrf-8g6f-7xwp | high | node-forge | <=1.4.0 | Forge: Denial of service in TLS record processing via a record interleaved with a fragmented handshake message |
| CVE-2026-119187 | GHSA-hqq3-7jhf-c5jx | high | node-forge | <=1.4.0 | Forge: Denial of service in TLS record processing via call stack exhaustion |
| CVE-2026-118782 | GHSA-jc66-7q78-782g | high | node-forge | <=1.4.0 | Forge: PKCS#12 MAC forgery and constant-key PBE via zero iteration count |
| CVE-2026-33894 | GHSA-ppp5-5v6c-4jwp | high | node-forge | <1.4.0 | Forge has signature forgery in RSA-PKCS due to ASN.1 extra field |
| CVE-2026-33895 | GHSA-q67f-28xg-22rw | high | node-forge | <1.4.0 | Forge has signature forgery in Ed25519 due to missing S > L check |
| CVE-2026-119191 | GHSA-rhr8-3pm8-cq29 | high | node-forge | <=1.4.0 | Forge: ASN.1 resource exhaustion via BIT STRING decoding in asn1.fromDer |
| CVE-2024-45296, CVE-2026-4867 | GHSA-37ch-88jc-xwx2 | high | path-to-regexp | <0.1.13 | path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters |
| CVE-2026-4926 | GHSA-j3q9-mxjg-w52f | high | path-to-regexp | >=8.0.0 <8.4.0 | path-to-regexp vulnerable to Denial of Service via sequential optional groups |
| CVE-2024-4367 | GHSA-wgrm-67xf-hhpq | high | pdfjs-dist | <=4.1.392 | PDF.js vulnerable to arbitrary JavaScript execution upon opening a malicious PDF |
| CVE-2026-55388 | GHSA-x9g3-xrwr-cwfg | high | piscina | >=5.0.0-alpha.0 <=5.1.4 | piscina: Prototype Pollution Gadget → RCE via inherited options.filename |
| CVE-2026-45623 | GHSA-6g55-p6wh-862q | high | postcss | <=8.5.11 | PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments |
| CVE-2026-73646 | GHSA-r28c-9q8g-f849 | high | postcss | <=8.5.17 | PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure |
| CVE-2026-27606 | GHSA-mw96-cpmx-2vgc | high | rollup | >=4.0.0 <4.59.0 | Rollup 4 has Arbitrary File Write via Path Traversal |
| – | GHSA-5c6j-r48x-rmvq | high | serialize-javascript | <=7.0.2 | Serialize JavaScript is Vulnerable to RCE via RegExp.flags and Date.prototype.toISOString() |
| CVE-2026-114113 | GHSA-f88m-g3jw-g9cj | high | sharp | <0.35.0 | sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| CVE-2026-114112 | GHSA-rgj7-g3m4-5g8c | high | sharp | <0.35.4 | sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 |
| CVE-2026-114111 | GHSA-wq5f-xc86-pv6w | high | sharp | <0.35.5 | sharp : Vulnerability in librsvg dependency CVE-2026-96889 |
| CVE-2026-13311 | GHSA-395f-4hp3-45gv | high | shell-quote | <=1.8.4 | shell-quote: Quadratic-complexity Denial of Service in `parse()` (CWE-407) |
| CVE-2026-48815 | GHSA-52v5-jr5w-gjxr | high | sigstore | <=4.1.0 | sigstore's `certificateOIDs` verification constraints are silently dropped and never enforced |
| CVE-2026-69185 | GHSA-2m8v-j782-fhvr | high | socket.io-parser | >=4.0.0 <4.2.7 | Socket.IO: Zero-attachment Memory Exhaustion |
| CVE-2026-33151 | GHSA-677m-j7p3-52f9 | high | socket.io-parser | >=4.0.0 <4.2.6 | socket.io allows an unbounded number of binary attachments |
| CVE-2026-93749 | GHSA-68fv-2mgg-jv7q | high | source-map-js | >=1.0.0 <1.2.2 | source-map-js allows event-loop denial of service through indexed source-map section offsets |
| CVE-2026-24842 | GHSA-34x7-hfp2-rc4v | high | tar | <7.5.7 | node-tar Vulnerable to Arbitrary File Creation/Overwrite via Hardlink Path Traversal |
| CVE-2026-26960 | GHSA-83g3-92jg-28cx | high | tar | <7.5.8 | Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain in node-tar Extraction |
| CVE-2026-23745 | GHSA-8qq5-rm4j-mr97 | high | tar | <=7.5.2 | node-tar is Vulnerable to Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization |
| CVE-2026-59874 | GHSA-8x88-c5mf-7j5w | high | tar | <=7.5.17 | node-tar: Negative tar entry size causes infinite loop in archive replace |
| CVE-2026-31802 | GHSA-9ppj-qmqm-q256 | high | tar | <=7.5.10 | node-tar Symlink Path Traversal via Drive-Relative Linkpath |
| CVE-2026-29786 | GHSA-qffp-2rhf-9h96 | high | tar | <=7.5.9 | tar has Hardlink Path Traversal via Drive-Relative Linkpath |
| CVE-2026-73566 | GHSA-r292-9mhp-454m | high | tar | <=7.5.20 | node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection |
| CVE-2026-23950 | GHSA-r6q2-hw4h-h46w | high | tar | <=7.5.3 | Race Condition in node-tar Path Reservations via Unicode Ligature Collisions on macOS APFS |
| CVE-2026-44705 | GHSA-ph9p-34f9-6g65 | high | tmp | <0.2.6 | tmp has Path Traversal via unsanitized prefix/postfix that enables directory escape |
| CVE-2026-109383 | GHSA-2m5v-pch6-74hx | high | undici | >=4.0.0 <6.29.1 | undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent |
| CVE-2026-13697 | GHSA-4cwx-7wf7-3272 | high | undici | >=7.0.0 <7.29.0 | undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives |
| CVE-2026-109829 | GHSA-4w7w-5xrc-9h26 | high | undici | >=7.0.0 <7.30.1 | undici vulnerable to cache poisoning and cross-user disclosure via cross-origin redirects |
| CVE-2026-1528 | GHSA-f269-vfmq-vjvj | high | undici | >=6.0.0 <6.24.0 | Undici: Malicious WebSocket 64-bit length overflows parser and crashes the client |
| CVE-2026-87018 | GHSA-qrxm-fqhp-jwvm | high | undici | >=4.2.1 <6.29.1 | undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation |
| CVE-2026-19534 | GHSA-rfgv-xxqx-mfg5 | high | undici | >=6.7.0 <6.28.1 | undici vulnerable to Denial of Service via unrequested WebSocket subprotocol |
| CVE-2026-2229 | GHSA-v9p9-hfj2-hcw8 | high | undici | <6.24.0 | Undici has Unhandled Exception in WebSocket Client Due to Invalid server_max_window_bits Validation |
| CVE-2026-1526 | GHSA-vrm6-8vpv-qv8q | high | undici | <6.24.0 | Undici has Unbounded Memory Consumption in WebSocket permessage-deflate Decompression |
| CVE-2026-12151 | GHSA-vxpw-j846-p89q | high | undici | <6.27.0 | undici WebSocket client vulnerable to denial of service via fragment count bypass |
| CVE-2026-109869 | GHSA-xjj6-f33q-929c | high | undici | >=7.18.0 <7.30.1 | undici vulnerable to Denial of Service via unhandled error on excessive content-encodings |
| CVE-2026-39363 | GHSA-p9ff-h696-f583 | high | vite | >=7.0.0 <=7.3.1 | Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket |
| CVE-2026-39364 | GHSA-v2wj-q39q-566r | high | vite | >=7.1.0 <=7.3.1 | Vite: `server.fs.deny` bypassed with queries |
| CVE-2026-76844 | GHSA-g84c-rxfj-3j2c | high | webpack-dev-middleware | <7.4.5 | webpack-dev-middleware vulnerable to Path Traversal via non-slash-terminated publicPath |
| CVE-2026-48779 | GHSA-96hv-2xvq-fx4p | high | ws | >=7.0.0 <7.5.11 | ws: Memory exhaustion DoS from tiny fragments and data chunks |
| CVE-2026-88059 | GHSA-p297-fm68-3q8c | moderate | @angular/common | >=21.0.0 <21.2.20 | Angular: Information Leak via `HttpTransferCache` Bypass When Using `withRequestsMadeViaParent` |
| CVE-2026-54265 | GHSA-58w9-8g37-x9v5 | moderate | @angular/compiler | >=21.0.0-next.0 <21.2.17 | @angular/compiler: Two-Way Property Binding Sanitization Bypass (XSS) |
| CVE-2026-50557 | GHSA-f3m7-gqxr-g87x | moderate | @angular/compiler | >=21.0.0-next.0 <21.2.15 | Angular: Template and Attribute Namespace Sanitization Bypass (XSS) |
| CVE-2026-88057 | GHSA-hh8m-fm6v-7cvg | moderate | @angular/compiler | >=21.0.0 <21.2.20 | Angular: Sanitization bypass via directive host bindings on concrete host elements in @angular/core and @angular/compiler |
| CVE-2026-52725 | GHSA-692r-grfm-v8x7 | moderate | @angular/core | >=21.0.0-next.0 <21.2.15 | @angular/core: Angular Template and Dynamic Component Namespace Bypass leading to Cross-Site Scripting (XSS) |
| CVE-2026-50557 | GHSA-f3m7-gqxr-g87x | moderate | @angular/core | >=21.0.0-next.0 <21.2.15 | Angular: Template and Attribute Namespace Sanitization Bypass (XSS) |
| CVE-2026-88057 | GHSA-hh8m-fm6v-7cvg | moderate | @angular/core | >=21.0.0 <21.2.20 | Angular: Sanitization bypass via directive host bindings on concrete host elements in @angular/core and @angular/compiler |
| CVE-2026-50184 | GHSA-95qp-cmmw-mgqv | moderate | @angular/service-worker | >=21.0.0-next.0 <21.2.15 | @angular/service-worker: Request Credential & Cache Policy Stripping |
| CVE-2026-50169 | GHSA-gv2q-mqqv-365m | moderate | @angular/service-worker | >=21.0.0-next.0 <21.2.15 | Angular Service Worker Policy-Bypass & Credential-Stripping Vulnerabilities |
| CVE-2026-39406 | GHSA-92pp-h63x-v22m | moderate | @hono/node-server | <1.19.13 | @hono/node-server: Middleware bypass via repeated slashes in serveStatic |
| – | GHSA-frvp-7c67-39w9 | moderate | @hono/node-server | <1.19.15 | Node.js Adapter for Hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`) |
| CVE-2026-126210 | GHSA-jpvv-r467-5p4w | moderate | @hono/node-server | <1.19.18 | @hono/node-server: Backslash in the request path is parsed as a path separator, bypassing path-based access control at a reverse proxy |
| CVE-2026-82866 | GHSA-pgx6-7jcq-2qff | moderate | @pdfme/common | <=5.5.9 | PDFME has SSRF via Unvalidated URL Fetch in `getB64BasePdf` When `basePdf` Is Attacker-Controlled |
| CVE-2026-82864 | GHSA-vrqm-gvq7-rrwh | moderate | @pdfme/pdf-lib | <=5.5.9 | PDFME Affected by Decompression Bomb in FlateDecode Stream Parsing Causes Memory Exhaustion DoS |
| CVE-2026-82868 | GHSA-87v3-4cfp-cm76 | moderate | @pdfme/schemas | <=5.5.8 | Cross-Site Scripting (XSS) via SVG Schema innerHTML Injection in @pdfme/schemas |
| CVE-2026-82867 | GHSA-qq9g-96v4-m3cj | moderate | @pdfme/schemas | <=5.5.8 | Cross-Site Scripting (XSS) via Select Schema Option Value Injection in @pdfme/schemas |
| CVE-2026-82865 | GHSA-xgx4-2wgv-4jhm | moderate | @pdfme/schemas | <=5.5.9 | PDFME has XSS via Unsanitized i18n Label Injection into innerHTML in multiVariableText propPanel |
| CVE-2026-40181 | GHSA-2j2x-hqr9-3h42 | moderate | @remix-run/router | >=1.3.0 <1.23.3 | React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation |
| CVE-2026-48758 | GHSA-jfc7-64v2-mr8c | moderate | @sigstore/core | <=3.2.0 | @sigstore/core has DSSE payloadType type-binding failure |
| CVE-2026-48816 | GHSA-xgjw-pm74-86q4 | moderate | @sigstore/verify | =3.1.0 | sigstore-js has Insufficient Verification of Data Authenticity |
| CVE-2025-64526 | GHSA-7mqx-wwh4-f9fw | moderate | @strapi/plugin-users-permissions | <=5.44.0 | Strapi has a rate limit bypass on users-permissions plugin via attacker-controlled email keying |
| CVE-2026-22707 | GHSA-pcw7-5633-82vv | moderate | @strapi/upload | <=5.33.2 | Strapi Upload Plugin MIME Validation Bypass via Content API |
| CVE-2025-62718 | GHSA-3p68-rc4w-qgx5 | moderate | axios | >=1.0.0 <1.15.0 | Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF |
| CVE-2026-42044 | GHSA-3w6x-2g7m-8v23 | moderate | axios | >=1.0.0 <1.15.2 | Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget in `parseReviver` |
| CVE-2026-67313 | GHSA-42h9-826w-cgv3 | moderate | axios | >=1.0.0 <1.18.0 | Axios: Excessive recursion in formDataToJSON can cause denial of service |
| CVE-2026-42037 | GHSA-445q-vr5w-6q77 | moderate | axios | >=1.0.0 <1.15.1 | Axios: CRLF Injection in multipart/form-data body via unsanitized blob.type in formDataToStream |
| CVE-2026-101900 | GHSA-4hqw-qxg8-jxx2 | moderate | axios | >=1.12.0 <1.20.0 | Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders |
| CVE-2026-42034 | GHSA-5c9x-8gcm-mpgx | moderate | axios | >=1.0.0 <1.15.1 | Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 |
| CVE-2026-42039 | GHSA-62hf-57xw-28j9 | moderate | axios | >=1.0.0 <1.15.1 | Axios: unbounded recursion in toFormData causes DoS via deeply nested request data |
| CVE-2026-67319 | GHSA-7q8q-rj6j-mhjq | moderate | axios | >=1.0.0 <1.18.0 | Axios: Nested axios option objects can consume polluted prototype values |
| CVE-2026-44490 | GHSA-898c-q2cr-xwhg | moderate | axios | >=1.0.0 <1.16.0 | axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions |
| CVE-2026-101902 | GHSA-9fr6-4gfg-395g | moderate | axios | >=1.0.0 <1.20.0 | Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method |
| CVE-2026-40175 | GHSA-fvcv-3m26-pcqx | moderate | axios | >=1.0.0 <1.15.0 | Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain |
| CVE-2026-101904 | GHSA-j8rh-479h-cp32 | moderate | axios | >=1.0.0 <1.20.0 | Axios: Header Injection via Inherited headers After Minimal Interceptor |
| CVE-2026-67317 | GHSA-jqh4-m9w3-8hp9 | moderate | axios | >=1.7.0 <1.18.0 | Axios: Fetch adapter `ReadableStream` uploads bypass `maxBodyLength` |
| CVE-2026-42038 | GHSA-m7pr-hjqh-92cm | moderate | axios | >=1.0.0 <1.15.1 | Axios: no_proxy bypass via IP alias allows SSRF |
| CVE-2026-67316 | GHSA-mmx7-hfxf-jppx | moderate | axios | >=1.0.0 <1.18.0 | Axios: Prototype pollution gadgets can alter axios request construction |
| CVE-2026-67312 | GHSA-pmv8-rq9r-6j72 | moderate | axios | >=1.0.0 <1.18.0 | Axios: Deep formToJSON Key Recursion Can Cause Denial of Service |
| CVE-2026-42036 | GHSA-vf2m-468p-8v99 | moderate | axios | >=1.0.0 <1.15.1 | Axios: HTTP adapter streamed responses bypass maxContentLength |
| CVE-2026-101908 | GHSA-vh66-26gq-q6x8 | moderate | axios | >=1.7.0 <1.20.0 | Axios: Prototype pollution gadget in fetch adapter can alter outbound requests |
| CVE-2026-42041 | GHSA-w9j2-pvgh-6h63 | moderate | axios | >=1.0.0 <1.15.1 | Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy |
| CVE-2026-42042 | GHSA-xx6v-rp6x-q39c | moderate | axios | >=1.0.0 <1.15.1 | Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion |
| CVE-2026-45819 | GHSA-w5vr-8v7q-w6rv | moderate | baseline-browser-mapping | >=2.0.0 <2.11.0 | baseline-browser-mapping process termination on invalid input causes denial of service |
| CVE-2026-2739 | GHSA-378v-28hj-76wf | moderate | bn.js | <4.12.3 | bn.js affected by an infinite loop |
| CVE-2026-33750 | GHSA-f886-m6hf-6m8v | moderate | brace-expansion | >=2.0.0 <2.0.3 | brace-expansion: Zero-step sequence causes process hang and memory exhaustion |
| CVE-2026-102277 | GHSA-q2hr-2g5m-vwhr | moderate | brace-expansion | >=2.0.0 <2.1.7 | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service |
| CVE-2026-65903 | GHSA-39q2-94rc-95cp | moderate | dompurify | <=3.3.3 | DOMPurify's ADD_TAGS function form bypasses FORBID_TAGS due to short-circuit evaluation |
| CVE-2026-75838 | GHSA-55q2-fjhq-7xh7 | moderate | dompurify | <=3.4.12 | DOMPurify: IN_PLACE hook removal leaves a detached subtree executable, causing XSS |
| CVE-2026-65902 | GHSA-76mc-f452-cxcm | moderate | dompurify | <3.4.7 | DOMPurify: Hook mutation of `data.allowedTags` / `data.allowedAttributes` permanently pollutes `DEFAULT_ALLOWED_TAGS` / `DEFAULT_ALLOWED_ATTR` |
| CVE-2026-65913 | GHSA-cj63-jhhr-wcxv | moderate | dompurify | <=3.3.1 | DOMPurify USE_PROFILES prototype pollution allows event handlers |
| CVE-2026-65912 | GHSA-cjmm-f4jc-qw8r | moderate | dompurify | <=3.3.1 | DOMPurify ADD_ATTR predicate skips URI validation |
| CVE-2026-65898 | GHSA-cmwh-pvxp-8882 | moderate | dompurify | <=3.4.10 | DOMPurify: Permanent `ALLOWED_ATTR` pollution via `setConfig()` bypassing the hook clone-guard (incomplete fix of the 3.4.7 hook-pollution patch) |
| CVE-2026-41239 | GHSA-crv5-9vww-q3g8 | moderate | dompurify | >=1.0.10 <3.4.0 | DOMPurify has a SAFE_FOR_TEMPLATES bypass in RETURN_DOM mode |
| CVE-2026-41240 | GHSA-h7mw-gpvr-xq4m | moderate | dompurify | <3.4.0 | DOMPurify: FORBID_TAGS bypassed by function-based ADD_TAGS predicate (asymmetry with FORBID_ATTR fix) |
| CVE-2026-65914 | GHSA-h8r8-wccr-v5f2 | moderate | dompurify | <3.3.2 | DOMPurify is vulnerable to mutation-XSS via Re-Contextualization |
| CVE-2026-49458 | GHSA-hpcv-96wg-7vj8 | moderate | dompurify | <=3.4.5 | DOMPurify: Cross-realm IN_PLACE sanitization leaves executable markup intact via realm-bound `instanceof` checks |
| CVE-2026-49459 | GHSA-r47g-fvhr-h676 | moderate | dompurify | <=3.4.5 | DOMPurify: IN_PLACE mode preserves attributes of a clobbered root element, allowing XSS via attacker-controlled root DOM |
| CVE-2026-49978 | GHSA-rp9w-3fw7-7cwq | moderate | dompurify | <=3.4.6 | DOMPurify IN_PLACE Sanitization Bypass via Attached Shadow Root Inside <template>.content |
| CVE-2026-0540 | GHSA-v2wj-7wpq-c8vv | moderate | dompurify | >=3.1.3 <=3.3.1 | DOMPurify contains a Cross-site Scripting vulnerability |
| CVE-2026-41238 | GHSA-v9jr-rg53-9pgp | moderate | dompurify | >=3.0.1 <3.4.0 | DOMPurify: Prototype Pollution to XSS Bypass via CUSTOM_ELEMENT_HANDLING Fallback |
| CVE-2026-86472 | GHSA-hrr3-gc8f-f4qj | moderate | fast-uri | >=3.0.0 <3.1.8 | fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets |
| CVE-2026-110306 | GHSA-w74x-v6f9-j3xg | moderate | fast-uri | >=3.0.0 <3.1.9 | fast-uri vulnerable to URI scheme spoofing via percent-encoded scheme decoding |
| CVE-2026-41650 | GHSA-gh4j-gqv2-49f6 | moderate | fast-xml-parser | >=5.0.0 <5.7.0 | fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped Delimiters |
| CVE-2026-33349 | GHSA-jp2q-39xq-3w4g | moderate | fast-xml-parser | >=5.0.0 <5.5.7 | Entity Expansion Limits Bypassed When Set to Zero Due to JavaScript Falsy Evaluation in fast-xml-parser |
| CVE-2026-45820 | GHSA-px8p-9vwx-vf98 | moderate | fflate | >=0.8.0 <0.8.3 | fflate unzipSync can enter an infinite loop when parsing malformed ZIP64 archives |
| CVE-2026-31808 | GHSA-5v7r-6r5c-r473 | moderate | file-type | >=13.0.0 <21.3.1 | file-type affected by infinite loop in ASF parser on malformed input with zero-size sub-header |
| CVE-2026-32630 | GHSA-j47w-4g3g-c36v | moderate | file-type | >=20.0.0 <=21.3.1 | file-type: ZIP Decompression Bomb DoS via [Content_Types].xml entry |
| CVE-2026-40895 | GHSA-r4q5-vmmm-2653 | moderate | follow-redirects | <=1.15.11 | follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets |
| CVE-2026-33916 | GHSA-2qvq-rjwj-gvw9 | moderate | handlebars | >=4.0.0 <4.7.9 | Handlebars.js has Prototype Pollution Leading to XSS through Partial Template Injection |
| – | GHSA-7rx3-28cr-v5wh | moderate | handlebars | >=4.6.0 <=4.7.8 | Handlebars.js has a Prototype Method Access Control Gap via Missing __lookupSetter__ Blocklist Entry |
| CVE-2026-106444 | GHSA-xw65-4hp5-5hc7 | moderate | handlebars | >=4.0.0 <=4.7.9 | Handlebars: JavaScript Injection via Unsafe Inline Embedding of Precompiled Templates |
| CVE-2026-56762 | GHSA-26pp-8wgv-hjvm | moderate | hono | <4.12.12 | Hono missing validation of cookie name on write path in setCookie() |
| CVE-2026-47676 | GHSA-2gcr-mfcq-wcc3 | moderate | hono | <4.12.21 | Hono: app.mount() strips mount prefix using undecoded path, causing incorrect routing for percent-encoded paths |
| CVE-2026-47675 | GHSA-3hrh-pfw6-9m5x | moderate | hono | <4.12.21 | Hono: Cookie helper does not sanitize sameSite and priority, allowing Set-Cookie injection |
| CVE-2026-56761 | GHSA-458j-xx4x-4375 | moderate | hono | <4.12.14 | hono Improperly Handles JSX Attribute Names Allows HTML Injection in hono/jsx SSR |
| CVE-2026-126355 | GHSA-46wx-v44x-9hh2 | moderate | hono | <4.13.16 | Hono: `csrf()` does not check requests sent by hyperlink auditing (`text/ping`) |
| CVE-2026-126356 | GHSA-4h7h-rv7c-7m2v | moderate | hono | >=4.5.1 <=4.13.15 | Hono: `validator('form')` skips validation for `multipart/form-data` requests with extra parameters |
| CVE-2026-126357 | GHSA-4m76-xfj5-7975 | moderate | hono | <4.13.16 | Hono: `mount()` and `app.mount()` can forward a path that bypasses middleware scoped inside the mount prefix |
| CVE-2026-29086 | GHSA-5pq2-9x2x-5p6w | moderate | hono | <4.12.4 | Hono Vulnerable to Cookie Attribute Injection via Unsanitized domain and path in setCookie() |
| CVE-2026-44455 | GHSA-69xw-7hcm-h432 | moderate | hono | <4.12.16 | hono/jsx has Unvalidated JSX Tag Names that May Allow HTML Injection |
| CVE-2026-24472 | GHSA-6wqw-2p9w-4vw4 | moderate | hono | <4.11.7 | Hono cache middleware ignores "Cache-Control: private" leading to Web Cache Deception |
| CVE-2026-69207 | GHSA-8j4g-w8fx-2239 | moderate | hono | <4.12.34 | Hono: ReDoS in CORS middleware via Access-Control-Request-Headers |
| CVE-2026-24771 | GHSA-9r54-q6cx-xmh5 | moderate | hono | <4.11.7 | Hono vulnerable to XSS through ErrorBoundary component |
| CVE-2026-44456 | GHSA-9vqf-7f2p-gf9v | moderate | hono | <4.12.16 | Hono: bodyLimit() can be bypassed for chunked / unknown-length requests |
| CVE-2026-84363 | GHSA-crvj-82cr-hjcx | moderate | hono | <4.13.5 | Hono: Query parser reads parameters after the URL fragment, causing cache-key and proxy interpretation differentials |
| CVE-2026-71850 | GHSA-f23p-vx2j-j53r | moderate | hono | >=3.8.0 <4.12.34 | Hono: `memo()` retains SSR output across requests, leading to cross-user data disclosure |
| CVE-2026-47673 | GHSA-f577-qrjj-4474 | moderate | hono | <4.12.21 | Hono: JWT middleware accepts any Authorization scheme, not only Bearer |
| CVE-2026-84364 | GHSA-g6gw-c38x-mqfc | moderate | hono | <4.13.5 | Hono: Unbounded dot-notation nesting in `parseBody()` can cause memory exhaustion |
| CVE-2026-84365 | GHSA-gqvv-2mrq-wpjv | moderate | hono | <4.13.5 | Hono: Incomplete fix for CVE-2026-39408: `toSSG()` still writes files outside the output directory |
| CVE-2026-126358 | GHSA-h7mg-cq63-vhpq | moderate | hono | >=4.1.4 <=4.13.15 | Hono: RegExpRouter skips wildcard middleware for some route sets and for paths with an encoded line terminator |
| CVE-2026-93981 | GHSA-hxh3-vqpv-xpqv | moderate | hono | <4.13.7 | hono/jsx renders plain strings unescaped in boundary components, leading to XSS |
| CVE-2026-54287 | GHSA-j6c9-x7qj-28xf | moderate | hono | <4.12.25 | hono: AWS Lambda adapter merges multiple `Set-Cookie` headers into one value, dropping cookies on ALB single-header and Lattice |
| CVE-2026-29085 | GHSA-p6xx-57qc-3wxr | moderate | hono | <4.12.4 | Hono Vulnerable to SSE Control Field Injection via CR/LF in writeSSE() |
| CVE-2026-44457 | GHSA-p77w-8qqv-26rm | moderate | hono | <4.12.18 | Hono's Cache Middleware ignores Vary: Authorization / Vary: Cookie leading to cross-user cache leakage |
| CVE-2026-44458 | GHSA-qp7p-654g-cw7p | moderate | hono | <4.12.18 | Hono has CSS Declaration Injection via Style Object Values in JSX SSR |
| CVE-2026-24398 | GHSA-r354-f388-2fhh | moderate | hono | <4.11.7 | Hono IPv4 address validation bypass in IP Restriction Middleware allows IP spoofing |
| CVE-2026-39410 | GHSA-r5rp-j6wh-rvv4 | moderate | hono | <4.12.12 | Hono: Non-breaking space prefix bypass in cookie name handling in getCookie() |
| CVE-2026-54288 | GHSA-rv63-4mwf-qqc2 | moderate | hono | <4.12.25 | hono: Body Limit Middleware can be bypassed on AWS Lambda by understating `Content-Length` |
| CVE-2026-56763 | GHSA-v8w9-8mx6-g223 | moderate | hono | <4.12.7 | Hono vulnerable to Prototype Pollution possible through __proto__ key allowed in parseBody({ dot: true }) |
| CVE-2026-24473 | GHSA-w332-q679-j88p | moderate | hono | <4.11.7 | Hono has an Arbitrary Key Read in Serve static Middleware (Cloudflare Workers Adapter) |
| CVE-2026-59895 | GHSA-w62v-xxxg-mg59 | moderate | hono | >=4.0.0 <4.12.27 | Hono: Server-Side XSS via JSX Escaping Bypass in cx() Utility |
| CVE-2026-54289 | GHSA-wgpf-jwqj-8h8p | moderate | hono | <4.12.25 | hono: Lambda@Edge adapter keeps only the last value of a repeated request header, dropping the rest |
| CVE-2026-39407 | GHSA-wmmm-f939-6g9c | moderate | hono | <4.12.12 | Hono: Middleware bypass via repeated slashes in serveStatic |
| CVE-2026-54286 | GHSA-wwfh-h76j-fc44 | moderate | hono | <4.12.25 | hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`) |
| CVE-2026-39408 | GHSA-xf4j-xp2r-rqqx | moderate | hono | >=4.0.0 <=4.12.11 | Hono: Path traversal in toSSG() allows writing files outside the output directory |
| CVE-2026-59897 | GHSA-xgm2-5f3f-mvvc | moderate | hono | >=4.3.3 <4.12.27 | Hono: API Gateway v1 adapter can drop a distinct repeated request header value during de-duplication |
| CVE-2026-39409 | GHSA-xpcf-pg52-r92g | moderate | hono | <4.12.12 | Hono has incorrect IP matching in ipRestriction() for IPv4-mapped IPv6 addresses |
| CVE-2026-47674 | GHSA-xrhx-7g5j-rcj5 | moderate | hono | <4.12.21 | Hono: IP Restriction bypasses static deny rules for non-canonical IPv6 |
| CVE-2026-55602 | GHSA-64mm-vxmg-q3vj | moderate | http-proxy-middleware | >=3.0.0 <3.0.6 | http-proxy-middleware `router` host+path substring matching allows Host-header-driven backend routing bypass |
| CVE-2026-101911 | GHSA-h3mg-xc3c-68pw | moderate | ip-address | <=10.7.0 | ip-address: Address6 builds a parse diagnostic proportional to the input with no length bound, allowing a single long string to stall or crash the process |
| CVE-2026-101912 | GHSA-j6r3-76f7-8jcv | moderate | ip-address | <=10.7.0 | ip-address: isInSubnet() and isHostInSubnet() compare addresses of different families as if they shared an address space, allowing an allowlist check to admit an address outside its range |
| CVE-2026-101913 | GHSA-rpw4-54j3-4h4q | moderate | ip-address | <=10.5.0 | ip-address: Address6.isLinkLocal() recognizes fe80::/64 rather than fe80::/10, allowing SSRF and trust-boundary bypass to on-link hosts |
| CVE-2026-111997 | GHSA-rxp7-6hxx-x8q5 | moderate | ip-address | <=10.7.3 | ip-address: Address6 matches a zone identifier in quadratic time ahead of its length limit, allowing a single long string to stall the process |
| CVE-2026-42338 | GHSA-v2v4-37r5-5v8g | moderate | ip-address | <=10.1.0 | ip-address has XSS in Address6 HTML-emitting methods |
| CVE-2026-48038 | GHSA-q7cg-457f-vx79 | moderate | joi | >=18.0.0 <18.2.1 | joi has an uncaught RangeError on deeply nested input through recursive `link()` schemas |
| CVE-2026-90771 | GHSA-wr44-6hxh-3jwq | moderate | joi | >=18.0.0 <18.2.9 | joi messages compilation allows prototype replacement through __proto__ error codes |
| CVE-2026-53550 | GHSA-h67p-54hq-rp68 | moderate | js-yaml | >=4.0.0 <=4.1.1 | JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases |
| CVE-2026-112943 | GHSA-698v-4r3x-3vcv | moderate | launch-editor | <=2.14.1 | launch-editor: escapeCmdArgs() omits % escaping on Windows |
| CVE-2026-112944 | GHSA-r825-w8mm-5pxw | moderate | launch-editor | <=2.14.1 | launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors |
| CVE-2026-53632 | GHSA-v6wh-96g9-6wx3 | moderate | launch-editor | <=2.14.0 | launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows |
| CVE-2025-13465 | GHSA-xxjr-mmjv-4gpg | moderate | lodash | >=4.0.0 <=4.17.22 | Lodash has Prototype Pollution Vulnerability in `_.unset`, `_.omit`, and `_.pullAt` functions |
| CVE-2025-13465 | GHSA-xxjr-mmjv-4gpg | moderate | lodash-es | >=4.0.0 <4.17.23 | Lodash has Prototype Pollution Vulnerability in `_.unset`, `_.omit`, and `_.pullAt` functions |
| – | GHSA-253c-mchw-3w2r | moderate | markdown-it | <14.3.1 | markdown-it linkify: true has two quadratic paths, so a few hundred KB of markdown blocks the event loop for tens of seconds |
| CVE-2026-2327 | GHSA-38c4-r59v-3vqw | moderate | markdown-it | >=13.0.0 <14.1.1 | markdown-it is has a Regular Expression Denial of Service (ReDoS) |
| CVE-2026-48988 | GHSA-6v5v-wf23-fmfq | moderate | markdown-it | <=14.1.1 | markdown-it: Quadratic complexity DoS in smartquotes rule via replaceAt string operations |
| CVE-2026-118778 | GHSA-525v-9gp9-w22h | moderate | node-forge | <=1.4.0 | Forge: TLS client crash when the server sends no certificate |
| CVE-2026-119186 | GHSA-5cwg-6vw7-rj6p | moderate | node-forge | <=1.4.0 | Forge: AES-GCM authentication bypass via unvalidated tagLength option |
| CVE-2026-125333 | GHSA-6cv4-p8m7-4r25 | moderate | node-forge | >=0.1.2 <=1.4.2 | Forge: ReDoS in forge.http response header and cookie trimming |
| CVE-2026-118777 | GHSA-6wvx-3r32-xmcg | moderate | node-forge | <=1.4.0 | Forge: Prototype Pollution in forge.http cookie handling via a malicious Set-Cookie |
| CVE-2026-119189 | GHSA-h46v-rmh6-fq4f | moderate | node-forge | <=1.4.0 | Forge: X.509 pathLenConstraint not enforced by verifyCertificateChain() for CA certificates without keyUsage |
| CVE-2026-125334 | GHSA-j8rw-jp99-435v | moderate | node-forge | <=1.4.2 | Forge: TLS client crash on a handshake record received without a session |
| CVE-2026-125332 | GHSA-w4xr-hqv8-ch44 | moderate | node-forge | <=1.4.2 | Forge: TLS client crash on an unsupported ServerHello compression method |
| CVE-2026-4923 | GHSA-27v5-c462-wpq7 | moderate | path-to-regexp | >=8.0.0 <8.4.0 | path-to-regexp vulnerable to Regular Expression Denial of Service via multiple wildcards |
| CVE-2026-69153 | GHSA-fxqj-rqcc-2cmp | moderate | postcss | <=8.5.22 | PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset |
| CVE-2026-41305 | GHSA-qx2v-qp2m-jg93 | moderate | postcss | <8.5.10 | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output |
| CVE-2026-104844 | GHSA-rj75-hqrm-r3gf | moderate | postcss-selector-parser | >=7.0.0 <7.1.6 | PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion |
| CVE-2026-5758 | GHSA-j452-xhg8-qg39 | moderate | protocol-buffers-schema | <3.6.1 | Mafintosh's protocol-buffers-schema is vulnerable to prototype pollution |
| CVE-2026-82417 | GHSA-4mjr-xmp4-gh2g | moderate | qs | >=2.2.5 <6.16.0 | qs: Denial of Service via Attacker Controlled isBuffer |
| CVE-2026-110816 | GHSA-6pq8-jhm2-2vcw | moderate | qs | >=6.7.0 <=6.16.0 | qs : qs.stringify with arrayFormat 'comma' throws an uncaught TypeError on array elements carrying a non-callable own toString (DoS) |
| CVE-2025-15284 | GHSA-6rw7-vpxm-498p | moderate | qs | <6.14.1 | qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion |
| CVE-2026-8723 | GHSA-q8mj-m7cp-5q26 | moderate | qs | >=6.11.1 <=6.15.1 | qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set |
| CVE-2026-40181 | GHSA-2j2x-hqr9-3h42 | moderate | react-router | >=6.7.0 <6.30.4 | React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation |
| CVE-2026-53668 | GHSA-jjmj-jmhj-qwj2 | moderate | react-router-dom | >=6.30.2 <=6.30.5 | React Router: Open redirect leading to XSS |
| CVE-2026-113661 | GHSA-cv27-6wvh-8x7j | moderate | sanitize-html | <2.18.0 | ApostropheCMS: Incomplete CVE-2026-53606: `meta http-equiv=refresh` `content` still ships `javascript:` / `data:` URLs |
| CVE-2026-84371 | GHSA-g8qq-57p8-ggw5 | moderate | sanitize-html | >=1.9.0 <=2.17.6 | ApostropheCMS: Stored XSS via SVG SMIL URI-list scheme-policy bypass |
| CVE-2026-63670 | GHSA-jxwj-j7wr-gfrw | moderate | sanitize-html | <=2.17.5 | ApostropheCMS: Mutation-XSS / allowedTags bypass via literal `</textarea/>` solidus close |
| CVE-2026-53606 | GHSA-vccv-cmxp-4j9h | moderate | sanitize-html | >=1.18.0 <=2.17.4 | sanitize-html has incomplete URI scheme validation in that allows javascript: URIs through action, formaction, data, poster, and background attributes |
| CVE-2026-113654 | GHSA-x3q4-9hxx-gx8m | moderate | sanitize-html | <2.18.0 | ApostropheCMS sanitize-html: nonTextTags discard region ends early on an implied close, letting <noscript> content render |
| CVE-2026-34043 | GHSA-qj8w-gfj5-8c6v | moderate | serialize-javascript | >=5.0.0 <7.0.5 | Serialize JavaScript has CPU Exhaustion Denial of Service via crafted array-like objects |
| CVE-2026-71429 | GHSA-528h-pc64-c93x | moderate | stream-json | <=3.4.0 | stream-json: pick/ignore/filter/replace filters are O(depth²) on nested input — small crafted JSON blocks the event loop for seconds→minutes (DoS) |
| CVE-2026-104182 | GHSA-hqr4-qq8f-hg3x | moderate | stream-json | <=3.5.0 | stream-json: JSONC parser and verifier re-scan the whole accumulated comment on every input chunk |
| CVE-2026-104183 | GHSA-mjw6-4jj6-33hc | moderate | stream-json | <3.6.0 | stream-json has a prototype pollution issue: Assembler writes this.current[this.key] on plain objects |
| CVE-2026-59875 | GHSA-gvwx-54wh-qm9j | moderate | tar | <=7.5.16 | node-tar: Uncaught Exception DoS via NUL byte in PAX path/linkpath records |
| CVE-2026-53655 | GHSA-vmf3-w455-68vh | moderate | tar | <=7.5.15 | node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling) |
| CVE-2026-59871 | GHSA-w8wr-v893-vjvp | moderate | tar | <=7.5.17 | node-tar: Process crash via PAX numeric path type confusion |
| CVE-2026-84933 | GHSA-2jfj-6hjv-fm6j | moderate | undici | >=7.0.0 <7.29.1 | undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches |
| CVE-2026-1525 | GHSA-2mjp-6q6p-2qxm | moderate | undici | <6.24.0 | Undici has an HTTP Request/Response Smuggling issue |
| CVE-2026-84890 | GHSA-3xpg-4rpp-hhhm | moderate | undici | >=7.15.0 <7.29.1 | undici vulnerable to Denial of Service via unbounded decompression of compressed responses |
| CVE-2026-1527 | GHSA-4992-7rv2-5pvq | moderate | undici | <6.24.0 | Undici has CRLF Injection in undici via `upgrade` option |
| CVE-2026-109924 | GHSA-4qv8-2p9j-2685 | moderate | undici | >=6.5.0 <6.29.1 | undici vulnerable to Denial of Service via unbounded memory in the EventSource parser |
| CVE-2026-87029 | GHSA-55wc-3pg8-jfw6 | moderate | undici | >=7.15.0 <7.30.1 | undici vulnerable to Denial of Service via unhandled exception in the decompress interceptor |
| CVE-2026-16728 | GHSA-8xcm-r25x-g524 | moderate | undici | <6.28.0 | undici vulnerable to downstream response desynchronization via retry interceptor |
| CVE-2026-109932 | GHSA-9fm3-97px-rjf6 | moderate | undici | >=5.15.0 <6.29.1 | undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering |
| CVE-2026-109841 | GHSA-f72v-6w45-q472 | moderate | undici | >=7.15.0 <7.30.1 | undici vulnerable to Subresource Integrity bypass via non-lowercase algorithm tokens |
| CVE-2026-22036 | GHSA-g9mf-h72j-4rw9 | moderate | undici | >=7.0.0 <7.18.2 | Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion |
| CVE-2026-14643 | GHSA-jr45-8vmc-qm54 | moderate | undici | >=7.0.0 <7.29.0 | undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives |
| CVE-2026-15157 | GHSA-m8rv-5g2x-5cg5 | moderate | undici | <6.28.0 | undici vulnerable to CRLF Injection via blob-like body 'type' property |
| CVE-2026-9679 | GHSA-p88m-4jfj-68fv | moderate | undici | <6.27.0 | undici vulnerable to HTTP header injection via Set-Cookie percent-decoding |
| CVE-2026-2581 | GHSA-phc3-fgpg-7m6h | moderate | undici | >=7.17.0 <7.24.0 | Undici has Unbounded Memory Consumption in its DeduplicationHandler via Response Buffering that leads to DoS |
| CVE-2026-18149 | GHSA-pmjh-fq2x-6v4x | moderate | undici | >=7.11.0 <7.29.1 | undici vulnerable to Denial of Service via orphaned RetryHandler response body |
| CVE-2026-9678 | GHSA-pr7r-676h-xcf6 | moderate | undici | >=7.0.0 <7.28.0 | undici vulnerable to cross-user information disclosure via shared cache whitespace bypass |
| CVE-2026-85014 | GHSA-rx4f-c7p8-82vq | moderate | undici | >=7.0.0 <7.29.1 | undici vulnerable to Denial of Service via WebSocketStream unclean close |
| CVE-2026-16729 | GHSA-v3r7-h72x-cjcm | moderate | undici | <6.28.0 | undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields |
| CVE-2026-6402 | GHSA-79cf-xcqc-c78w | moderate | webpack-dev-server | <=5.2.3 | webpack-dev-server vulnerable to cross-origin source code exposure on non-HTTPS origins |
| CVE-2026-14620 | GHSA-f5vj-f2hx-8m93 | moderate | webpack-dev-server | <=5.2.5 | webpack-dev-server vulnerable to cross-site request forgery via internal developer endpoints |
| CVE-2026-14631 | GHSA-m28w-2pqf-7qgj | moderate | webpack-dev-server | <=5.2.5 | webpack-dev-server vulnerable to denial of service via a malformed Host or Origin header |
| CVE-2026-9595 | GHSA-mx8g-39q3-5c79 | moderate | webpack-dev-server | <5.2.5 | webpack-dev-server vulnerable to HMR WebSocket interception via permissive user proxies |
| CVE-2026-54490 | GHSA-mp7j-qc5w-4988 | moderate | websocket-driver | <0.7.5 | websocket-driver: Resource limit bypass via message compression |
| CVE-2026-45736 | GHSA-58qx-3vcg-4xpx | moderate | ws | >=8.0.0 <8.20.1 | ws: Uninitialized memory disclosure |
| CVE-2026-33532 | GHSA-48c2-rrv3-qjmp | moderate | yaml | >=2.0.0 <2.8.3 | yaml is vulnerable to Stack Overflow via deeply nested YAML collections |
| CVE-2026-8769 | GHSA-866g-f22w-33x8 | low | @ai-sdk/provider-utils | <3.0.28 | @ai-sdk/provider-utils has an Uncontrolled Resource Consumption issue |
| CVE-2026-49356 | GHSA-4x5r-pxfx-6jf8 | low | @babel/core | <=7.29.0 | @babel/core: Arbitrary File Read via sourceMappingURL Comment |
| CVE-2026-22706 | GHSA-hvp3-26wx-g2w4 | low | @strapi/admin | <=5.33.2 | Strapi: Password Reset Does Not Revoke Existing Refresh Sessions |
| CVE-2025-48985 | GHSA-rwvc-j5jr-mgvh | low | ai | <5.0.52 | Vercel’s AI SDK's filetype whitelists can be bypassed when uploading files |
| CVE-2026-42040 | GHSA-xhjh-pmcv-23jw | low | axios | >=1.0.0 <1.15.1 | Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams |
| CVE-2026-12590 | GHSA-v422-hmwv-36x6 | low | body-parser | <1.20.6 | body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement |
| CVE-2026-24001 | GHSA-73rr-hh4g-fpgx | low | diff | >=5.0.0 <5.2.2 | jsdiff has a Denial of Service vulnerability in parsePatch and applyPatch |
| CVE-2026-109345 | GHSA-6688-9rhm-gjv2 | low | dompurify | <=3.4.15 | DOMPurify: IN_PLACE returns a force-removed rawtext root whose text carries attacker markup — pure HTML reparse executes |
| CVE-2026-66010 | GHSA-c2j3-45gr-mqc4 | low | dompurify | <=3.4.11 | DOMPurify: `CUSTOM_ELEMENT_HANDLING` bypasses `afterSanitizeElements` for allowed custom elements. |
| CVE-2026-116802 | GHSA-c6gr-qvv4-5v3f | low | dompurify | <=3.4.16 | DOMPurify: SMIL attributeName=href guard is skipped when PARSER_MEDIA_TYPE is application/xhtml+xml |
| CVE-2026-65900 | GHSA-gvmj-g25r-r7wr | low | dompurify | >=3.0.0 <=3.4.7 | DOMPurify: SAFE_FOR_TEMPLATES bypass - template expressions survive sanitization inside <template> content when using DOM output modes |
| CVE-2026-116803 | GHSA-mrv2-3pqr-j5jr | low | dompurify | <=3.4.16 | DOMPurify IN_PLACE: hook that removes a parent or sibling leaves the detached subtree's event handlers armed (incomplete fix for GHSA-p98j-92pf-mc4p) |
| CVE-2026-65899 | GHSA-vxr8-fq34-vvx9 | low | dompurify | <3.4.9 | DOMPurify: Trusted Types policy survives `clearConfig()` and can poison later `RETURN_TRUSTED_TYPE` output |
| CVE-2026-65901 | GHSA-x4vx-rjvf-j5p4 | low | dompurify | <=3.4.6 | DOMPurify: `IN_PLACE` mode trusts attacker-controlled `nodeName` on live non-form nodes, allowing script retention and XSS via attacker-supplied DOM objects |
| CVE-2025-14505 | GHSA-848j-6mx2-7j84 | low | elliptic | <=6.6.1 | Elliptic Uses a Cryptographic Primitive with a Risky Implementation |
| CVE-2026-110725 | GHSA-333x-w4r6-6crp | low | fast-uri | >=3.0.0 <3.1.9 | fast-uri vulnerable to scheme injection via an unescaped first-segment colon in suffix references |
| CVE-2026-110095 | GHSA-xhq7-xmqj-769h | low | fast-uri | >=3.0.0 <3.1.9 | fast-uri vulnerable to improper path equivalence in relative reference normalization |
| CVE-2026-126066 | GHSA-474x-hrwr-fgx4 | low | fast-xml-parser | <=5.11.2 | fast-xml-parser: Quadratic CPU consumption scanning unterminated stop-node tags |
| CVE-2026-27942 | GHSA-fj3w-jwp8-x2g3 | low | fast-xml-parser | >=5.0.0 <5.3.8 | fast-xml-parser has stack overflow in XMLBuilder with preserveOrder |
| – | GHSA-442j-39wm-28r2 | low | handlebars | >=4.0.0 <=4.7.8 | Handlebars.js has a Property Access Validation Bypass in container.lookup |
| CVE-2026-126359 | GHSA-3gg2-335m-rxc6 | low | hono | >=3.12.0 <=4.13.15 | Hono: `css` helper does not escape a closing tag split between the template and an interpolated value, allowing HTML injection |
| CVE-2026-71849 | GHSA-79qm-7rj5-m7r9 | low | hono | >=4.7.0 <4.12.34 | Hono: Proxy Helper does not remove response headers listed in the `Connection` header |
| CVE-2026-56764 | GHSA-gq3j-xvxp-8hrf | low | hono | <4.11.10 | Hono added timing comparison hardening in basicAuth and bearerAuth |
| CVE-2026-44459 | GHSA-hm8q-7f3q-5f36 | low | hono | <4.12.18 | Hono has improper validation of NumericDate claims (exp, nbf, iat) in JWT verify() |
| CVE-2026-122131, CVE-2026-84368 | GHSA-6w3j-5fw6-r9vr | low | joi | >=18.0.0 <18.2.5 | joi: Prototype pollution via a `__proto__` language key in custom messages |
| CVE-2026-84367 | GHSA-gg4h-3hg2-grpc | low | joi | >=18.0.0 <18.2.4 | joi: object().rename() with a template target can set the validated object's prototype |
| CVE-2026-111766 | GHSA-vfgh-jcmw-g37q | low | markdown-it | <14.3.3 | markdown-it: Quadratic-time denial of service in inline HTML parsing with html enabled |
| CVE-2026-118776 | GHSA-2vgq-wchc-25w7 | low | node-forge | <=1.4.0 | Forge: Incomplete PKCS#7 padding validation in AES/DES CBC and ECB decryption |
| CVE-2026-118780 | GHSA-4487-j8r4-4g2f | low | node-forge | <=1.4.0 | Forge: verifyCertificateChain() removes trusted CA certificates with the same subject from the CA store |
| CVE-2026-118775 | GHSA-4642-5mcj-2rqw | low | node-forge | <=1.4.0 | Forge: ASN.1 OID first arc truncation in asn1.oidToDer |
| CVE-2026-125335 | GHSA-6889-vf6x-f3g5 | low | node-forge | <=1.4.2 | Forge: Ed25519 signature verification accepts small-order public keys |
| CVE-2026-118774 | GHSA-9wg5-mj3p-v49q | low | node-forge | <=1.4.0 | Forge: Certificate signature verified with the issuer's RSA signature scheme |
| CVE-2026-118781 | GHSA-h6cr-wjv9-3cpp | low | node-forge | <=1.4.0 | Forge: Denial of Service via infinite loop in BigInteger.modInverse() with negative input (incomplete fix of CVE-2026-33891) |
| CVE-2026-9358 | GHSA-w9m9-85wc-3x92 | low | postcss-selector-parser | >=7.1.0 <7.1.3 | postcss-selector-parser allows denial of service through uncontrolled AST recursion |
| CVE-2026-2391 | GHSA-w7fw-mjwx-w883 | low | qs | >=6.7.0 <=6.14.1 | qs's arrayLimit bypass in comma parsing allows denial of service |
| CVE-2026-115754, CVE-2026-115897 | GHSA-m5mm-p8h7-m29v | low | serialize-javascript | <7.1.3 | Serialize JavaScript: Cross-site scripting (XSS) via unescaped </script at the end of a serialized function body |
| CVE-2026-84947 | GHSA-2gqq-gqf2-x968 | low | undici | >=7.1.0 <7.29.1 | undici vulnerable to response truncation via oversized chunked responses in the dump interceptor |
| CVE-2026-6733 | GHSA-35p6-xmwp-9g52 | low | undici | <6.27.0 | undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse |
| CVE-2026-85008 | GHSA-8436-99hf-9mmv | low | undici | >=7.0.0 <7.29.1 | undici vulnerable to caching and replay of unsafe HTTP method responses |
| CVE-2026-11525 | GHSA-g8m3-5g58-fq7m | low | undici | <6.27.0 | undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching |
| CVE-2026-18540 | GHSA-r53p-7pc4-xj5r | low | undici | <6.28.1 | undici vulnerable to downstream response splitting via retry interceptor |

## npm: durch Upgrade-Lauf 2026-11-23 behoben (21 Paare)

| CVE | GHSA | Schwere | Paket | Betroffene Version | Titel |
|---|---|---|---|---|---|
| CVE-2025-68428 | GHSA-f8cm-6447-x5h2 | critical | jspdf | <=3.0.4 | jsPDF has Local File Inclusion/Path Traversal vulnerability |
| CVE-2026-31938 | GHSA-wfv2-pwc8-crg5 | critical | jspdf | <=4.2.0 | jsPDF has HTML Injection in New Window paths |
| CVE-2026-111767 | GHSA-22jm-h49p-29qw | high | @modelcontextprotocol/sdk | >=1.24.0 <1.32.0 | MCP TypeScript SDK: Experimental tasks were not tied to the session that created them |
| CVE-2026-25536 | GHSA-345p-7cg4-v4c7 | high | @modelcontextprotocol/sdk | >=1.10.0 <=1.25.3 | @modelcontextprotocol/sdk has cross-client data leak via shared server/transport instance reuse |
| CVE-2026-111768 | GHSA-46jr-4wx8-v453 | high | @modelcontextprotocol/sdk | >=1.3.0 <1.32.0 | MCP TypeScript SDK: One HTTP request within the default size limit could exhaust server memory during validation |
| CVE-2026-104850 | GHSA-6qxp-vccf-f47h | high | @modelcontextprotocol/sdk | >=1.12.0 <1.31.0 | MCP TypeScript SDK: OAuth client could send credentials to an authorization server chosen by the MCP server |
| – | GHSA-f897-62hf-6gxq | high | @modelcontextprotocol/sdk | >=1.10.0 <1.30.1 | MCP TypeScript SDK: HTTP server transports and handlers did not limit request body size or JSON-RPC batch length |
| CVE-2026-25535 | GHSA-67pg-wm7f-q7fj | high | jspdf | <4.2.0 | jsPDF Affected by Client-Side/Server-Side Denial of Service via Malicious GIF Dimensions |
| CVE-2026-31898 | GHSA-7x6v-j9x4-qf24 | high | jspdf | <=4.2.0 | jsPDF has a PDF Object Injection via FreeText color |
| CVE-2026-24133 | GHSA-95fx-jjr5-f39c | high | jspdf | <=4.0.0 | jsPDF Vulnerable to Denial of Service (DoS) via Unvalidated BMP Dimensions in BMPDecoder |
| CVE-2026-25755 | GHSA-9vjf-qc39-jprp | high | jspdf | <4.2.0 | jsPDF has a PDF Object Injection via Unsanitized Input in addJS Method |
| CVE-2026-25940 | GHSA-p5xg-68wr-hm3m | high | jspdf | <4.2.0 | jsPDF has a PDF Injection in AcroForm module allows Arbitrary JavaScript Execution (RadioButton.createOption and "AS" property) |
| CVE-2026-24737 | GHSA-pqxr-3g65-p328 | high | jspdf | <=4.0.0 | jsPDF has PDF Injection in AcroFormChoiceField that allows Arbitrary JavaScript Execution |
| CVE-2026-9496 | GHSA-w4pp-8pjf-rmxw | high | pacote | >=11.2.7 <21.5.1 | pacote is vulnerable to Denial of Service (DoS) via the addGitSha function |
| CVE-2026-33671 | GHSA-c2c7-rcm5-vvqj | high | picomatch | >=4.0.0 <4.0.4 | Picomatch has a ReDoS vulnerability via extglob quantifiers |
| CVE-2026-111769 | GHSA-6prh-2h8m-c8cw | moderate | @modelcontextprotocol/sdk | <1.32.0 | MCP TypeScript client SDK: HTTP client transports and OAuth requests followed cross-origin redirects and re-sent custom headers and request bodies |
| CVE-2026-111771 | GHSA-rvq5-wwqv-78pq | moderate | @modelcontextprotocol/sdk | >=1.6.0 <1.32.0 | MCP TypeScript SDK: Server bearer authentication accepted tokens issued for another service |
| CVE-2025-69873 | GHSA-2g4f-4pwh-qvx6 | moderate | ajv | >=7.0.0-alpha.0 <8.18.0 | ajv has ReDoS when using `$data` option |
| CVE-2026-24040 | GHSA-cjw8-79x6-5cj4 | moderate | jspdf | <=4.0.0 | jsPDF has Shared State Race Condition in addJS Plugin |
| CVE-2026-24043 | GHSA-vm32-vv63-w422 | moderate | jspdf | <=4.0.0 | jsPDF Vulnerable to Stored XMP Metadata Injection (Spoofing & Integrity Violation) |
| CVE-2026-33672 | GHSA-3v7f-55p6-f55p | moderate | picomatch | >=4.0.0 <4.0.4 | Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching |

## npm: weiterhin offen (23 Paare)

| CVE | GHSA | Schwere | Paket | Betroffene Version | Titel |
|---|---|---|---|---|---|
| CVE-2026-77301 | GHSA-7q85-xj36-vmfc | high | adm-zip | <0.6.1 | adm-zip: Uncontrolled memory allocation via the declared uncompressed size (DoS) |
| CVE-2026-114102 | GHSA-8238-w5pm-2374 | high | adm-zip | <=0.6.0 | adm-zip: Unhandled error event in async DEFLATE decompression crashes Node.js process (DoS) |
| CVE-2026-102282 | GHSA-j5f4-cc29-5x44 | high | adm-zip | <=0.6.0 | adm-zip extraction preserves SUID/SGID bits from untrusted ZIPs -> local privilege escalation |
| CVE-2026-92000 | GHSA-rcw4-f5rp-g42v | high | adm-zip | <=0.6.0 | adm-zip: Decompression-bomb protection (fix for CVE-2026-39244) can be bypassed by declaring uncompressed size as 0 |
| CVE-2026-39244 | GHSA-xcpc-8h2w-3j85 | high | adm-zip | <0.6.0 | adm-zip: Crafted ZIP file triggers 4GB memory allocation |
| CVE-2026-112942 | GHSA-587h-7wmj-h5pm | high | vite | >=7.0.0 <=7.3.6 | launch-editor: `fs.existsSync()` existence check can be bypassed on Windows |
| CVE-2023-54404 | GHSA-mrhx-c7xc-m3w5 | high | zod | <4.6.6 | Zod can exhaust memory while validating oversized constrained collections |
| CVE-2026-114103 | GHSA-c6fg-446q-cg94 | moderate | adm-zip | <=0.6.0 | adm-zip: getDataAsync() bypasses the maxOutputLength size guard enforced by the synchronous getData() path |
| CVE-2026-114104 | GHSA-p634-w6r4-rjp2 | moderate | adm-zip | <=0.6.0 | adm-zip: Duplicate ZIP entry names: getEntry() and extractAllTo() resolve to different content |
| CVE-2026-76845 | GHSA-vwc7-r8mq-g2x9 | moderate | adm-zip | >=0.5.9 <=0.6.0 | adm-zip extraction follows destination symlinks, allowing arbitrary file overwrite |
| CVE-2026-118773 | GHSA-3g3m-2fjr-6pw4 | moderate | glob | >=9.0.0 <=14.0.1 | Glob: AbortSignal cancellation bypass allows post-timeout filesystem traversal |
| CVE-2026-118764 | GHSA-g3hv-75wg-m249 | moderate | minimatch | >=7.0.0 <11.0.1 | minimatch has potential denial of service via globparts amplification |
| CVE-2026-53666 | GHSA-337j-9hxr-rhxg | moderate | react-router | >=6.4.0 <7.18.0 | React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration |
| CVE-2026-53669 | GHSA-wrjc-x8rr-h8h6 | moderate | react-router | >=6.0.0 <7.18.0 | React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass) |
| CVE-2026-41907, CVE-2026-41988 | GHSA-w5hq-g745-h8pq | moderate | uuid | <11.1.1 | uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided |
| CVE-2026-39365 | GHSA-4w7w-66w2-5vf9 | moderate | vite | >=7.0.0 <=7.3.1 | Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling |
| CVE-2026-112943 | GHSA-698v-4r3x-3vcv | moderate | vite | >=7.0.0 <=7.3.6 | launch-editor: escapeCmdArgs() omits % escaping on Windows |
| CVE-2026-53571 | GHSA-fx2h-pf6j-xcff | moderate | vite | >=7.0.0 <=7.3.4 | vite: `server.fs.deny` bypass on Windows alternate paths |
| CVE-2026-112944 | GHSA-r825-w8mm-5pxw | moderate | vite | >=7.0.0 <=7.3.6 | launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors |
| CVE-2026-112946 | GHSA-rq7h-c2jc-7f22 | moderate | vite | >=7.0.0 <=7.3.6 | Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine |
| CVE-2026-53632 | GHSA-v6wh-96g9-6wx3 | moderate | vite | >=7.0.0 <=7.3.4 | launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows |
| CVE-2025-15056, CVE-2026-120350 | GHSA-v3m3-f69x-jf25 | low | quill | =2.0.3 | Quill is vulnerable to XSS via HTML export feature |
| CVE-2026-112945 | GHSA-9jrq-w75r-8gcw | low | vite | >=7.0.0 <=7.3.6 | Vite: Cross origin script execution through Vite custom middleware |

## npm: neu hinzugekommen (3 Paare)

| CVE | GHSA | Schwere | Paket | Betroffene Version | Titel |
|---|---|---|---|---|---|
| CVE-2026-118663 | GHSA-rmxm-3fg6-px4f | moderate | @hono/node-server | >=1.19.10 <2.1.3 | @hono/node-server: `serveStatic` decodes the request path a second time, leading to bypass of middleware on static paths |
| – | GHSA-g7r4-m6w7-qqqr | low | esbuild | >=0.27.3 <0.28.1 | esbuild allows arbitrary file read when running the development server on Windows |
| CVE-2026-16633 | GHSA-hq66-cqwq-w95j | high | pdfjs-dist | >=5.6.83 <6.2.108 | PDF.js: Arbitrary JavaScript execution upon opening a malicious PDF |

pdfjs-dist kommt über `@pdfme/converter` 6.0.6 (Override in `zskarte/package.json`) und ist durch das pdfme-Upgrade vom 2026-11-23 hinzugekommen. Der Fix liegt bei pdfjs-dist ≥ 6.2.108, das der Converter nicht zulässt. Ungeprüft: Override auf pdfjs-dist, siehe `TODO.md`.

## pip: Befunde vorher und nachher

### Vorher (`6947bc4`)

| Dienst | Paket | Version | Advisory | CVE | Behoben ab |
|---|---|---|---|---|---|
| searchserv | anyio | 4.14.0 | PYSEC-2026-4025 | CVE-2026-63374 | 4.14.2 |
| searchserv | anyio | 4.14.0 | PYSEC-2026-4023 | CVE-2026-63349 | 4.14.2 |
| searchserv | anyio | 4.14.0 | PYSEC-2026-4024 | CVE-2026-64847 | 4.14.2 |
| searchserv | certifi | 2026.6.17 | PYSEC-2026-4320 | – | 2026.10.18 |
| searchserv | dnspython | 2.8.0 | CVE-2026-114605 | CVE-2026-114605 | 2.9.0 |
| searchserv | dnspython | 2.8.0 | CVE-2026-128089 | CVE-2026-128089 | 2.9.2 |
| searchserv-db-init | anyio | 4.9.0 | PYSEC-2026-4025 | CVE-2026-63374 | 4.14.2 |
| searchserv-db-init | anyio | 4.9.0 | PYSEC-2026-4024 | CVE-2026-64847 | 4.14.2 |
| searchserv-db-init | certifi | 2025.1.31 | PYSEC-2026-4320 | – | 2026.10.18 |
| searchserv-db-init | dnspython | 2.7.0 | CVE-2026-114605 | CVE-2026-114605 | 2.9.0 |
| searchserv-db-init | dnspython | 2.7.0 | CVE-2026-128089 | CVE-2026-128089 | 2.9.2 |
| searchserv-db-init | starlette | 0.46.1 | PYSEC-2026-1941 | CVE-2025-54121 | 0.47.2 |
| searchserv-db-init | starlette | 0.46.1 | PYSEC-2026-1942 | CVE-2025-62727 | 0.49.1 |
| searchserv-db-init | starlette | 0.46.1 | PYSEC-2026-161 | CVE-2026-48710 | 1.0.1 |
| searchserv-db-init | starlette | 0.46.1 | PYSEC-2026-2281 | CVE-2026-48818 | 1.1.0 |
| searchserv-db-init | starlette | 0.46.1 | PYSEC-2026-2280 | CVE-2026-48817 | 1.1.0 |
| searchserv-db-init | starlette | 0.46.1 | PYSEC-2026-249 | CVE-2026-54283 | 1.3.1 |
| searchserv-db-init | starlette | 0.46.1 | PYSEC-2026-248 | CVE-2026-54282 | 1.3.0 |
| searchserv-db-init | h11 | 0.14.0 | PYSEC-2026-348 | CVE-2025-43859 | 0.16.0 |
| searchserv-db-init | idna | 3.10 | PYSEC-2026-215 | CVE-2026-45409 | 3.15 |
| searchserv-db-init | orjson | 3.10.16 | PYSEC-2026-107 | CVE-2025-67221 | 3.11.5 |
| searchserv-db-init | pygments | 2.19.1 | PYSEC-2026-2987 | CVE-2026-4539 | 2.20.0 |
| searchserv-db-init | python-dotenv | 1.1.0 | PYSEC-2026-2270 | CVE-2026-28684 | 1.2.2 |
| searchserv-db-init | python-multipart | 0.0.20 | PYSEC-2026-1852 | CVE-2026-24486 | 0.0.22 |
| searchserv-db-init | python-multipart | 0.0.20 | PYSEC-2026-3038 | CVE-2026-40347 | 0.0.26 |
| searchserv-db-init | python-multipart | 0.0.20 | PYSEC-2026-3039 | CVE-2026-42561 | 0.0.27 |
| searchserv-db-init | python-multipart | 0.0.20 | PYSEC-2026-3040 | CVE-2026-53540 | 0.0.31 |
| searchserv-db-init | python-multipart | 0.0.20 | PYSEC-2026-3036 | CVE-2026-53539 | 0.0.30 |
| searchserv-db-init | python-multipart | 0.0.20 | PYSEC-2026-3037 | CVE-2026-53538 | 0.0.30 |
| searchserv-db-init | ujson | 5.10.0 | PYSEC-2026-2291 | CVE-2026-32874 | 5.12.0 |
| searchserv-db-init | ujson | 5.10.0 | PYSEC-2026-2292 | CVE-2026-32875 | 5.12.0 |
| searchserv-db-init | ujson | 5.10.0 | PYSEC-2026-2293 | CVE-2026-44660 | 5.12.1 |
| searchserv-db-init | ujson | 5.10.0 | PYSEC-2026-2294 | CVE-2026-54911 | 5.13.0 |

### Nachher (HEAD)

| Dienst | Paket | Version | Advisory | CVE | Behoben ab |
|---|---|---|---|---|---|
| searchserv | anyio | 4.14.0 | PYSEC-2026-4025 | CVE-2026-63374 | 4.14.2 |
| searchserv | anyio | 4.14.0 | PYSEC-2026-4023 | CVE-2026-63349 | 4.14.2 |
| searchserv | anyio | 4.14.0 | PYSEC-2026-4024 | CVE-2026-64847 | 4.14.2 |
| searchserv | certifi | 2026.6.17 | PYSEC-2026-4320 | – | 2026.10.18 |
| searchserv | dnspython | 2.8.0 | CVE-2026-114605 | CVE-2026-114605 | 2.9.0 |
| searchserv | dnspython | 2.8.0 | CVE-2026-128089 | CVE-2026-128089 | 2.9.2 |

## Offene Punkte aus dem Code (`TODO.md`, Audit 2 und 3)

Erledigt im Audit-3-Lauf (Commits ab `ca600bf`): A3 (Proxy-Route), A5 (Journal-Nummer), A8 (Socket-Origin), A9 (Log-Kodierung), A10 (Fehlversuche-Zähler), A11 (Build-Werte), dazu Kurzcodes nur einmal einlösbar, Gesamtgrenze für Fehlversuche, 999999 als Kurzcode, Suche ohne Platzhalter.

Offen:
- A1 Share-Login-Ratenbegrenzung hinter Traefik (`proxy: true`).
- A4 XSS über Adress-Token im Editor (`address-token.blot.ts`).
- A7 `zskarte.sh` bricht bei leerer Pflicht-Variable mit `ZSK_TRAEFIK=true` nicht ab.

Vom Betreiber akzeptiert:
- A2 Beispiel-Secrets aus `.env.example` bei `zskarte.sh start`.
- A6 DB-Passwort-Fallback `supersecret123`.
