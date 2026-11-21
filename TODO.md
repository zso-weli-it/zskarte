# TODO / offene Punkte

Arbeitsprotokoll für den autonomen Lauf. Probleme, Annahmen und offene Fragen.

## Erledigt
- Zeilenenden: Arbeitskopie auf LF normalisiert, `.gitattributes` auf `* text=auto eol=lf` gesetzt (Index war bereits LF).
- `zskarte.sh start -b`: Flag wird jetzt aus `$2` gelesen (vorher `$FLAG`, nie gesetzt).

## Annahmen (bitte prüfen)
- Postgres-Datenverzeichnis `zskarte/data/postgresql` enthält keine echten Daten (nur Reste eines fehlgeschlagenen Laufs). Wird nicht migriert.
- Bitnami-Image (`bitnamilegacy`) wird durch offizielles `postgres` ersetzt; Named Volumes statt Bind-Mounts, weil NTFS-Mounts unter WSL kein `chmod` erlauben.

## Offen
- Deployment-Lauf mit `zskarte.sh init` / `start` in WSL prüfen.
- Versionsstand aller Abhängigkeiten gegen Registry prüfen (npm outdated, pip index).
- `zskarte2/` ignorieren (laut Vorgabe).
- Strapi-Major-Upgrade nur wenn zwingend.
