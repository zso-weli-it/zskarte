# Changelog

## 7.0.9
- Sicherheit: Ein gelöschter Freigabe-Link funktioniert nicht mehr, auch nicht mit einem alten Login. Offene Verbindungen dazu werden getrennt. Wer vor dem Update über einen Freigabe-Link arbeitet, meldet sich einmal mit dem Freigabe-Code neu an.
- Sicherheit: Freigaben mit dem Typ "all" werden nicht mehr angelegt, sie konnten nie genutzt werden.
- Karte: Beim Archivieren einer Operation werden noch nicht gespeicherte Änderungen zuerst gesichert.
- Karte: Andere Nutzer bekommen nur Änderungen, die der Server übernommen hat. So stimmen die Karten überein.
- Standort: Ein ungültiger Breitengrad wird abgelehnt. Wer das Teilen des Standorts beendet, verschwindet sauber von der Karte.
- Kartenlayer: Jeder Kanton in der Liste wird geprüft, nicht nur der erste.
- Kartenlayer: Der Hintergrundprozess wird auch dann beendet, wenn das Speichern am Ende fehlschlägt.
- Such-Dienst: Nach einem Update wird er neu gebaut, wenn sich seine Dateien geändert haben.
- Kartenschnappschüsse werden nach 30 Tagen gelöscht, damit die Datenbank nicht unbegrenzt wächst.
- Aufgeräumt: tote Zweige und auskommentierter Code in den Zugriffsregeln entfernt, Journal-Nummern vereinfacht.

## 7.0.8
- Sicherheit: Die Karten-Webseite kann nur noch von der eigenen Seite in einem iframe eingebettet werden (Schutz gegen Clickjacking).

## 7.0.7
- Sicherheit: Die Karten-Webseite sendet einen HSTS-Header, der Browser zwingt, die Seite über HTTPS zu öffnen.
- Sicherheit: Der Server gibt keine Herstellerangabe mehr im Header `X-Powered-By` aus.

## 7.0.6
- Sicherheit: Die Karten-Webseite sendet jetzt eine Content-Security-Policy und verbietet Browsern das Zwischenspeichern der Startseite.

## 7.0.5
- Upload-Grenze für Kartenlayer: standardmäßig 50 MB, in deploy.env über ZSK_MAX_UPLOAD_MB einstellbar.
- Kartensuche: Ergebnisse werden nach der Kartenmitte sortiert, nicht mehr nach dem festen Punkt im Such-Dienst.
- Sicherheit: Eingefügte Adress-Token mit HTML werden nur noch als Text angezeigt (XSS-Lücke geschlossen).
- Sicherheit: Einmal-Freigabecodes und Fehlversuche werden strenger geprüft, Socket-Verbindungen nur von der App-Adresse.
- PDF-Druck: pdfme 6.2.8.
- zskarte.sh: mit ZSK_TRAEFIK=true bricht der Start ab, wenn eine Traefik-Einstellung fehlt.
- Aufgeräumt: ungenutzter Code entfernt, Suche in einer Funktion zusammengeführt.

## 7.0.4
- Build: Werte aus deploy.env werden sicher in die App geschrieben. Anführungszeichen brechen den Build nicht mehr.
- Suche: % und _ im Suchbegriff wirken nicht mehr als Platzhalter.
- Aufgeräumt: nicht genutzte Pakete entfernt (immutable, @types/uuid), toter Suchcode entfernt.

## 7.0.3
- Sicherheit: falsch eingegebene Freigabe-Codes sind zusätzlich insgesamt begrenzt (100 in 15 Minuten). In dieser Zeit werden alle Code-Anmeldungen abgelehnt.
- Sicherheit: Kurzcodes sind 000000 bis 999999 (der Code 999999 wurde nie ausgegeben).
- Sicherheit: Socket-Verbindungen nur von der App-Adresse (ZSK_APP_URL).
- Sicherheit: Zugriffs-Logs kodieren Werte aus dem Request, Zeilenumbrüche erzeugen keine fremden Logzeilen.
- Speicher: Fehlversuche-Zähler vergisst abgelaufene Adressen.

## 7.0.2
- Sicherheit: Freigabe-Codes sind nur einmal einlösbar. Parallele Einlösungen erhalten nur eine Anmeldung.
- Journal: Nummern beim Ändern werden unter derselben Sperre geprüft wie beim Anlegen. Keine doppelten Nummern mehr.
- Sicherheit: offene Proxy-Route /api/proxy entfernt.

## 7.0.1
- Sicherheit: jsPDF 4.2.1 (schliesst kritische Lücken), Abhängigkeiten aktualisiert.
- Angular 22, TypeScript 6, Biome 2, ngx-quill 31, ol-mapbox-style 13, zone.js 0.16.
- PDF-Druck: pdfme 6.0.6.
- Weitere Bibliotheken: immer 11, uuid 14, file-type 22, shpjs 5, udsv 0.7.
- Deployment: `zskarte.sh update` holt den Code per git pull, startet ohne init und baut die Images nur bei Änderungen neu.
- Deployment: `zskarte.sh init` nur bei Bedarf für Karten- und Suchdaten ausführen.

## 7.0.0
- Node.js 26, PostgreSQL 18 (Datenbank per Dump und Restore übernehmen), Strapi 5.63.
- Versionsangabe <version>-<commit> auf der Login-Seite.
- Suchfeld-Label konfigurierbar.
- Signaturen und Freigabelink auch über http-Adressen.
- Journal: keine doppelten Nummern, keine Abstürze bei unbekannten IDs.
- Karte: keine verlorenen Änderungen beim Speichern.

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
