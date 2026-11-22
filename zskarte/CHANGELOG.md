# Changelog

## Unreleased (fork)

### Breaking
- Node.js 26.13.1 (LTS) für App- und Server-Image.
- PostgreSQL 18.1 statt 16.3: Bestehende Datenbanken per Dump und Restore übernehmen (README, „DB Migration“).
- Strapi 5.63.0 (vorher 5.33.x), Schema-Migrationen beim ersten Start.

### Deployment
- Traefik-Betrieb über Compose-Override (`docker-compose.traefik.yml`), Host-Ports entfallen.
- Postgres und pgAdmin nur auf `127.0.0.1`, mit Named Volumes.
- Frontend-URLs, Suchlabel und Versionsangabe als Build-Args.
- Versionsangabe `ZSKarte_<commit>` für Login-Seite und Service Worker.

### Sicherheit
- Share-Code-Token: nur Text-Werte akzeptiert.
- Share-Code-Ratenbegrenzung (10 falsche Codes pro Minute). Bekannt: hinter Traefik gilt sie für alle Nutzer gemeinsam.
- Access-Liste: Operation-Filter ersetzt den Organisations-Filter nicht mehr.

### Fehlerbehebungen
- Journal: keine doppelten Nummern beim Anlegen, 404 statt 500 beim Ändern.
- Karten-Status: Änderungen während des Speicherns gehen nicht mehr verloren.
- Signaturen und Freigabelink auf http-Adressen.
- Zugriffskontrolle: 403 statt 500 bei unbekannten IDs.

### Frontend
- Suchfeld-Label über `ZSK_ORG_NAME`.
- OpenLayers-Patch: keine Canvas-Warnung in der Konsole.
- Nicht genutzte Abhängigkeiten und tote `test.ts` entfernt.

### Server
- Kartenebenen-Code in Module nach Aufgaben aufgeteilt, Verhalten unverändert.
- Unit-Tests für Ratenbegrenzung, Access-Filter, Journal-Nummern und Karten-Status.

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
