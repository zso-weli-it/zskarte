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
export ZSK_EMBED_PARENTS="${ZSK_EMBED_PARENTS:-}"
. ./zskarte/scripts/embed-parents.sh
check_embed_parents "$ZSK_EMBED_PARENTS" || exit 1
if [ "${ZSK_TRAEFIK:-false}" = "true" ]; then
    # without these the public URLs and the Traefik labels would be broken, so stop before anything starts
    for required in ZSK_APP_HOST ZSK_API_HOST ZSK_SEARCH_HOST ZSK_TILES_HOST ZSK_TRAEFIK_NETWORK ZSK_TRAEFIK_ENTRYPOINT ZSK_TRAEFIK_CERTRESOLVER; do
        if [ -z "${!required:-}" ]; then
            echo "ZSK_TRAEFIK=true, but $required is empty in deploy.env" >&2
            exit 1
        fi
    done
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

# a change in these paths (or in deploy.env) means the images must be built again
BUILD_INPUTS="zskarte/packages zskarte/package.json zskarte/package-lock.json zskarte/patches zskarte/.npmrc zskarte/.dockerignore zskarte/Dockerfile.app zskarte/Dockerfile.server zskarte/docker-compose.yml docker-compose.yml"
BUILD_STATE=.build-state

build_env_hash() {
    sha256sum deploy.env | cut -d' ' -f1
}

# true if the working tree or the commit of the last build differs in the build inputs
needs_build() {
    if [ ! -f "$BUILD_STATE" ]; then
        return 0
    fi
    read -r built_commit built_env_hash < "$BUILD_STATE"
    if [ -n "$(git status --porcelain -- $BUILD_INPUTS)" ]; then
        return 0
    fi
    if ! git diff --quiet "$built_commit" HEAD -- $BUILD_INPUTS; then
        return 0
    fi
    [ "$built_env_hash" != "$(build_env_hash)" ]
}

record_build() {
    echo "$(git rev-parse HEAD) $(build_env_hash)" > "$BUILD_STATE"
}

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
    ./zskarte.sh start "$2"

    echo "Update complete. Run './zskarte.sh init' only when the map or search data must be refreshed."

elif [ "$CMD" = "start" ]; then
    BUILD_ARG=""

    if [ "$2" = "-b" ] || needs_build; then
        BUILD_ARG="--build"
        echo "Starting services and building images..."
    else
        echo "Starting services, images unchanged..."
    fi
    echo "Mode: ZSK_TRAEFIK=${ZSK_TRAEFIK:-false}, frontend API URL: $ZSK_API_URL"

    [ -f zskarte/packages/server/.env ] || cp zskarte/packages/server/.env.example zskarte/packages/server/.env
    docker compose $ZSK_FILES up -d $BUILD_ARG
    for e in search search-db; do [ -f searchserv/$e.env ] || cp searchserv/$e.env.example searchserv/$e.env; done
    docker compose $ROOT_FILES up -d $BUILD_ARG

    if [ -n "$BUILD_ARG" ]; then
        record_build
    fi
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
