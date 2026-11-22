# Changelog

## Unreleased (fork: offlinekarte)

Fork-Änderungen seit dem Init-Stand (`6947bc4`). Die Versionsnummer wird noch festgelegt.

### Breaking changes
- Konfiguration über `deploy.env` (Domains, Traefik, Frontend-URLs, Suchlabel, Versionspräfix). Das separate Deployment-Skript, das `environment.prod.ts` schreibt, wird nicht mehr gebraucht.
- Node.js 26.13.1 (LTS) für App- und Server-Image.
- PostgreSQL 18.1 statt Bitnami-PostgreSQL 16. Bestehende Datenbanken müssen per Dump und Restore übernommen werden (siehe README, Abschnitt „DB Migration“).
- Strapi 5.63.0 (vorher 5.33.x, gleiche Major-Version, Schema-Migrationen beim ersten Start).

### Deployment und Betrieb
- Traefik-Betrieb über `ZSK_TRAEFIK=true`: Labels und Netzwerk werden aus den Compose-Overrides gesetzt, direkte Host-Ports entfallen.
- Postgres und pgAdmin nur noch auf `127.0.0.1`.
- Postgres und pgAdmin mit Named Volumes statt Bind-Mounts (funktioniert unter WSL und Windows).
- `zskarte.sh start` legt fehlende `.env`-Dateien aus den Beispielen an.
- Tileserver-Init lädt die 1-GB-Karte nur bei geänderter Remote-Datei (ETag, Last-Modified, Größe) und ersetzt sie atomar.
- Such-Service wartet per Healthcheck auf die Datenbank.
- Python 3.15 für Such-Service und Loader (Requirements vollständig gepinnt).
- Shell-Skripte auf LF normalisiert, `start -b` übernimmt das Flag jetzt.

### Sicherheit
- Share-Code-Login: Token-Endpunkt akzeptiert nur Text-Werte (kein JSON-Objekt als Filter).
- Share-Code-Login: Ratenbegrenzung für falsche Codes (10 pro Minute). Bekannt: Hinter Traefik wirkt sie derzeit für alle Nutzer gemeinsam, siehe TODO (A1).
- Access-Liste: Der Operation-Filter ersetzt den Organisations-Filter nicht mehr.
- Zugriffskontrolle: kein 500 mehr bei unbekannten IDs auf öffentlichen Typen.
- Such-API: `bbox` wird geprüft, ungültige Werte werden ignoriert.

### Daten und Synchronisation
- Journal: Nummernvergabe pro Operation mit Transaktions-Sperre (keine doppelten Nummern beim Anlegen).
- Journal-Update: 404 statt 500 bei unbekannter ID.
- Karten-Status: Änderungs-Flag wird vor dem Speichern gelöscht, Änderungen während des Speicherns gehen nicht mehr verloren.
- Karten-Status: Änderungserkennung per Referenzvergleich statt Hash über den ganzen Zustand.
- Doppelter Persist-Timer entfernt, der Cron-Job speichert alle 15 Sekunden.
- Suche: Geo-Index auf Ortschaften wird jetzt benutzt.

### Frontend
- Signaturen und Freigabelink funktionieren auf http-Adressen (ohne `localhost`): kein `crypto.subtle` und kein `navigator.clipboard` mehr als Voraussetzung.
- Suchfeld-Label konfigurierbar (`ZSK_ORG_NAME`, Anzeige „<Name> (lokale Suche)“).
- Versionsangabe `ZSKarte_<commit>` auf der Login-Seite und im Service Worker (Hash des App-Ordners).
- OpenLayers-Patch: Hit-Detection mit `willReadFrequently`, behebt die Canvas-Konsolenwarnung.
- Nicht benötigte Abhängigkeiten entfernt (`ngx-indexed-db`, `@angular/platform-browser-dynamic`, doppeltes `wait-on`) und tote `test.ts` gelöscht.

### Server-Code
- `maplayer.ts` in Module nach Aufgaben aufgeteilt (Grenzen, Eingänge, Namen, Styles, Shared). Verhalten unverändert.
- Unit-Tests für Ratenbegrenzung, Access-Filter, Journal-Nummern und Karten-Status (`npm run test:unit`).

### Tests und Dokumentation
- E2E-Test für den XSS-Fall im Adress-Token-Editor (bekannt: schlägt fehl, bis der Fix umgesetzt ist).
- README: Azure-Abschnitt entfernt, Voraussetzungen und Installation auf `zskarte.sh` angepasst, Konfiguration über `deploy.env`, DB-Versionen, DB-Migration.

### Bekannte offene Punkte
- Adress-Token im Editor: Text wird als HTML interpretiert (Fix in Arbeit).
- Offener Proxy-Endpunkt `/api/proxy` (wird entfernt).
- Beispiel-Secrets in `.env.example` (Zufallswerte bei der Installation erzeugen).


## 6.0.2
- Add Geodienste layers
- Optimize address search map layer generation
- Optimize street search results
- Resource table clickable
- Rename protocol to list view
- Translation file cleanup / modularize
- Language change on login/operation/help page
- Show message number on readonly view
- Prevent multi submit on journal, allow submit with return
- Show current UI version & changelog
- Diverse small bugfixes

## 6.0.1
- Revert journal pagination logic

## 6.0.0
- Many UI/UX optimisations
- Additional draw layers
- Import export of journal together with map data
- Separate searchable help section
- Enter name directly after open operation
- Auto focus feature search when clicking add
- Add rectangle and circle drawing tools
- Global icon zoom & hide names
- Gefahrentafel symbol with UN number visible on symbol
- Customizable formation/transport/leader symbols
- Resource overview
- Message template (expert view - organization settings)
- Fix message address handling & optimize UI/controll
- Militatry time format for message time
- Auto increment messagenumber selectable(default)
- After decision message goes back to be drawn on map
- Add support for Shape-file layers
- Add autogenerate offline searchable layers for addresses/places
- Compass / Orientation on map
- Preparation for work offline (download required data)
- Diverse small bugfixes

## 5.1.1
- Diverse small bugfixes

## 5.1.0
- Offline Mode for journal (temporarly/Work offline)
- Search for street or water(section) goemetry
- Mark/highlight/recognize streets/addresses on Journal message creation / display
- Button to print journal entry for (continue) work analogue, pdf formular designable
- Button to switch to Map view
- Export full journal as Excel
- Keep journal sort & filters
- Automatic update on journal changes(server side push)
- Automatic messageNumber & verify unique
- Journal on map view with "draw view" and option to highlight already drawn symbols
- Click messageNumber on symbols to navigate to journal entry
- Fix different right problems
- Fix problem: symbols on new created/switched operation are not shown/drawn
- Optimize error message handling / display from backend
- Add/fix/optimice some shortcuts (e.g. "+" for add new, "/" for search, "mod+backspace" works), and prevent map shortcuts on journal view
- Different other small fixes and features

## 5.0.0
- Merge Frontent and Server part to one Monorepo
- Add Message / Journal support
- Add support for additional map layers (WMS, WMTS, GeoJSON, CSV), see expert view
- With GeoJSON / CSV Layer add offline search capability
- Navigate to coordinate by enter them in search
- Update the style / look & feel of the page
- Add print / pdf export function
- Add person recovery overview
- Zoom to specific scale
- Allow to work local / offline
- Allow to view old / archived Operations
- Clearify / enforce goal of guest login
- Many other small fixes and features
- Upgrade used frameworks

## 4.0.0
- Implement new floating design
- Add undo/redo
- Set scenario on map level
- Show other connected clients
- Add Service Worker for PWA support.
- The local map can now be downloaded for offline usage.
- Map changes are now stored locally in case the client goes offline, the changes are not lost when reloading the page.
- Use WebGL for Map rendering.
