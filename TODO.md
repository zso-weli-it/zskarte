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
