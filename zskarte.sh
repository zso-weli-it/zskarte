#!/usr/bin/env bash
set -e

CMD=$1

# deploy.env: one place for hostnames and Traefik settings (see deploy.env.example)
[ -f deploy.env ] || cp deploy.env.example deploy.env
set -a
. ./deploy.env
set +a

# public URLs and name of the frontend, baked into the app image at build time
export ZSK_ORG_NAME="${ZSK_ORG_NAME:-}"
export ZSK_CODE_LOGIN="${ZSK_CODE_LOGIN:-true}"
export ZSK_WORK_LOCAL="${ZSK_WORK_LOCAL:-true}"
# app version for the service worker: hash of the app folder, so a new version shows only when the app changes
export COMMIT_SHA="$(git rev-parse --short=7 HEAD:zskarte/packages/app 2>/dev/null || echo unknown)"
if [ "${ZSK_TRAEFIK:-false}" = "true" ]; then
    export ZSK_API_URL="https://${ZSK_API_HOST}"
    export ZSK_SEARCH_URL="https://${ZSK_SEARCH_HOST}/search/"
    export ZSK_TILE_URL="https://${ZSK_TILES_HOST}/styles/osm-bright"
    export ZSK_APP_URL="https://${ZSK_APP_HOST}"
    # overrides tileserver.env: browsers request the public host, so it must be in the allowed list
    export TILESERVER_GL_ALLOWED_HOSTS="${ZSK_TILES_HOST}"
    TRAEFIK_ZSK="-f zskarte/docker-compose.traefik.yml"
    TRAEFIK_ROOT="-f docker-compose.traefik.yml"
else
    export ZSK_API_URL="http://localhost:1337"
    export ZSK_SEARCH_URL="http://localhost:8000/search/"
    export ZSK_TILE_URL="http://localhost:8080/styles/osm-bright"
    export ZSK_APP_URL="http://localhost:4300"
    TRAEFIK_ZSK=""
    TRAEFIK_ROOT=""
fi
ZSK_FILES="-f zskarte/docker-compose.yml $TRAEFIK_ZSK"
ROOT_FILES="-f docker-compose.yml $TRAEFIK_ROOT"

if [ "$CMD" = "init" ]; then
    echo "Running INIT workflow..."

    docker compose -f mapserv-init/docker-compose.yml run --rm offlinekarte-tileserver-init
    docker compose -f searchserv-db-init/docker-compose.yml up --build --abort-on-container-exit --exit-code-from searchserv-loader
    docker compose -f zskarte/docker-compose-init.yml up --build --abort-on-container-exit

    echo "Init complete."

elif [ "$CMD" = "update" ]; then
    echo "Running UPDATE workflow for zskarte..."

    git pull

    docker compose $ZSK_FILES down
    docker compose $ROOT_FILES down

    echo "Containers stopped."
    ./zskarte.sh init

    echo "Starting zskarte services..."
    ./zskarte.sh start -b
    echo "Init complete for zskarte."

elif [ "$CMD" = "start" ]; then
    BUILD_ARG=""

    if [ "$2" = "-b" ]; then
        BUILD_ARG="--build"
        echo "Starting services and forcing build..."
    else
        echo "Starting services..."
    fi
    echo "Mode: ZSK_TRAEFIK=${ZSK_TRAEFIK:-false}, frontend API URL: $ZSK_API_URL"

    [ -f zskarte/packages/server/.env ] || cp zskarte/packages/server/.env.example zskarte/packages/server/.env
    docker compose $ZSK_FILES up -d $BUILD_ARG
    for e in search search-db; do [ -f searchserv/$e.env ] || cp searchserv/$e.env.example searchserv/$e.env; done
    docker compose $ROOT_FILES up -d $BUILD_ARG

    echo "Services started."

elif [ "$CMD" = "stop" ]; then
    echo "Stopping services..."

    docker compose $ZSK_FILES down
    docker compose $ROOT_FILES down

    echo "Services stopped."

elif [ "$CMD" = "restart" ]; then
    ./zskarte.sh stop
    ./zskarte.sh start "$2"

else
    echo "Usage: $0 {init|update|start [-b]|stop|restart [-b]}"
    exit 1
fi
