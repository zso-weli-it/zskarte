# 🗺️ Zivilschutz-Karte (inkl. Offlinekarte) - Fork ZSO Wettingen-Limmattal

## ℹ️ About

Zivilschutz-Karte is a powerful JavaScript application (based on Angular) designed for creating detailed situation maps for disaster management. Developed specifically for Swiss civil defense organisations, it works seamlessly on both standard computers and interactive whiteboards. 🖥️ 📱

## 🔍 Key Features

- 🎨 Intuitive drawing interface
- 🌍 Multiple map provider integration
- 💾 Local storage support
- 🔄 Real-time collaboration
- 📱 Responsive design
- 🔒 Secure authentication

## 👀 Demo

You can run Zivilschutz-Karte without installation from [https://zskarte.ch](https://zskarte.ch). This is the production application. Please request access from your civil defence organisation or use the guest mode to try out.

<img alt="Screenshot of ZS-Karte" src="https://github.com/user-attachments/assets/c06261e2-7505-4d57-9834-1cee7aa5b8a4" />

## 🚀 Getting Started

### 🛠️ Prerequisites

- 🐳 Docker 27.x or higher, with the Compose plugin (`docker compose version`). Tested with Docker 29.
- 🐚 A bash shell for `zskarte.sh`: Linux, macOS or WSL2 on Windows.
- 💾 About 3 GB of free disk space (map tiles about 1 GB, search data about 200 MB).
- 🌐 Free ports on this machine: 1337, 4300, 7050, 8000, 8080, 55432.
- Only for development outside Docker: Node.js 22.x and npm 10.x (the Docker images use Node 22.22).

### 📋 Installation Steps

### 1. Download the map and search data (once, repeat e.g. twice a year)

```bash
./zskarte.sh init
```

### 2. Start all services

```bash
./zskarte.sh start      # add -b to force an image rebuild
```

On the first start the `.env` files are created from the `.example` files. The example values work for local development; change them before you use the system anywhere else.

### 3. Access the Strapi admin panel (Backend)

1. http://localhost:1337/admin
2. Login with credentials: User -> info@zskarte.ch, Password -> Supersecret123

### 4. Access the Zivilschutz-Karte application (Frontend)

Zivilschutz-Karte is optimized and tested for use with Google Chrome - nevertheless other browsers might work as well and are supported in a best effort manner.

1. http://localhost:4300
2. Login with credentials: User -> zso_development, Password -> Supersecret123

## 💡 Help & Feedback

Need assistance or want to share your thoughts? We'd love to hear from you!

- 🐛 Create an issue on GitHub
- 📧 Send feedback to [feedback@zskarte.ch](mailto:feedback@zskarte.ch)
- 💬 Join our community discussions

## ⚖️ Terms of Use

Please note, that this application integrates several different map provider services. Since the terms of use of the different services usually restrict the extent of use (limited quotas, restricted access to data layers), it's the liability of the user to make sure that the corresponding limitations and/or preconditions are fulfilled.

## 🛠️ Development Tools

### 🐳 Docker-Compose

This starts the PostgreSQL database for the backend (Strapi), the search database and pgAdmin.

#### First setup (downloads data, about 1 GB)

```bash
./zskarte.sh init
```

#### Start

```bash
./zskarte.sh start        # add -b to force an image rebuild
```

#### Stop

```bash
docker compose -f zskarte/docker-compose.yml down
docker compose down
```

Data is kept in the Docker volumes `zskarte_pgdata-zskarte` and `zskarte_pgadmin-zskarte`. `down` keeps them; `docker compose down -v` deletes them.

### Database access

Postgres and pgAdmin are only reachable from the local machine (`127.0.0.1`).

- PostgreSQL (backend): host `localhost`, port `55432`, user `postgres`, password `supersecret123`, database `zskarte`
- pgAdmin: [http://localhost:7050](http://localhost:7050), login `info@zskarte.ch` / `zskarte`
- pgAdmin already has the server "postgres-local" configured (`zskarte/packages/server/init/servers.json`)

> ⚠️ These are example passwords. Change them before you use the system anywhere else.

### Database versions

| Service | Image (pinned in) | Version |
|---|---|---|
| Backend database | `postgres:18.1` (`zskarte/docker-compose.yml`) | PostgreSQL 18.1 |
| Search database | `postgis/postgis:18-3.6` (`searchserv/docker-compose.yml`) | PostgreSQL 18.6, PostGIS 3.6.4 |
| pgAdmin | `dpage/pgadmin4:9` | pgAdmin 9 |
| Tile server | `maptiler/tileserver-gl` | not pinned |

To check the versions of the running containers:

```bash
# image names of the running containers
docker ps --format "{{.Names}}  {{.Image}}"

# PostgreSQL version of the backend database
docker exec postgresql-zskarte psql -U postgres -tAc "select version();"

# PostgreSQL and PostGIS version of the search database
docker exec offlinekarte-search-db psql -U postgres -tAc "select version();"
docker exec offlinekarte-search-db psql -U postgres -tAc "select postgis_full_version();"
```

### DB Migration (from the old installation with PostgreSQL 16)

The old setup (commit `6947bc4`) ran PostgreSQL 16.3 with a bind mount in `zskarte/data/postgresql`. PostgreSQL 18 cannot read that data directory, so the data is moved with a dump and restore. Make the backup first and keep it until the new installation is verified.

1. **Backup** (old installation still running):

   ```bash
   # dump inside the container (binary output is corrupted by shell redirection, e.g. in PowerShell)
   docker exec -e PGPASSWORD=supersecret123 postgresql-zskarte pg_dump -U postgres -w -Fc -f /tmp/zskarte-pg16.dump zskarte
   docker cp postgresql-zskarte:/tmp/zskarte-pg16.dump ./zskarte-pg16.dump
   ```

   Also copy `zskarte/packages/server/public/uploads` if it exists (not in Git).

2. **Stop the old installation**, keep its `data/` folder as fallback.

3. **Start the new version** (empty database, example data from `init.sql`):

   ```bash
   ./zskarte.sh init
   ./zskarte.sh start -b
   ```

4. **Replace the database content with the backup.** Stop the backend first so nothing reads the tables:

   ```bash
   docker stop server-zskarte
   docker cp ./zskarte-pg16.dump postgresql-zskarte:/tmp/zskarte-pg16.dump
   docker exec -e PGPASSWORD=supersecret123 postgresql-zskarte pg_restore -U postgres -w -d zskarte --clean --if-exists /tmp/zskarte-pg16.dump
   docker start server-zskarte
   ```

   Strapi applies its schema migrations (5.33 to 5.63) on this start. They cannot be reverted easily, so the dump from step 1 is the only fallback.

5. **Check:** log in to the Strapi admin, count the journal entries, open a map with signs.

> ⚠️ `pg_restore --clean` replaces the objects in database `zskarte`. Do not store anything else there.

### Informations for developer

More informations for developers for internal logic / tasks can be found in [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests
- 📚 Improve documentation

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

