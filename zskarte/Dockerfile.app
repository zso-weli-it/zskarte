FROM node:26.13.1-bookworm-slim AS build-app

# Create app directory
WORKDIR /app

# npm install
ADD ./.npmrc /app/.npmrc
ADD ./package.json /app/package.json
ADD ./package-lock.json /app/package-lock.json
ADD ./packages/app/package.json /app/packages/app/package.json
# patch-package (postinstall) needs the patches before npm ci
ADD ./patches /app/patches
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy all files
ADD --exclude=./packages/server . /app

# public URLs of the frontend (set by zskarte.sh from deploy.env), written into environment.prod.ts
ARG ZSK_API_URL
ARG ZSK_SEARCH_URL
ARG ZSK_TILE_URL
ARG ZSK_APP_URL
ARG GIT_URL
ARG ZSK_ORG_NAME
ARG ZSK_CODE_LOGIN
# read by scripts/update-ngsw-config.js (appData version for the service worker)
ARG COMMIT_SHA
RUN node packages/app/scripts/write-environment.js

# npm lint
RUN npm run lint:app
# npm build
RUN NODE_ENV=production npm run build:app && rm -rf /app/packages/app/src

FROM nginx:1.29.3-alpine


# EOF with single quotes to suppress $-expansion
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen       80;
    server_tokens off;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root   /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
EOF

#Copy built angular files to NGINX HTML folder
COPY --from=build-app /app/packages/app/dist/zskarte/browser /usr/share/nginx/html
