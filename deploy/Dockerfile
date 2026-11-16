FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS bun
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run test:unit && bun run lint && bun run build && bun run typecheck
RUN bun build scripts/geoip/update.ts --target node --outfile /app/geoip-update.mjs
RUN bun build scripts/dbip/update.ts --target node --outfile /app/dbip-update.mjs

FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

FROM ghcr.io/maxmind/geoipupdate:v8.0.0@sha256:51e70dd6f16cd3e4d845ac02d09940b10772a75b9d741427d235a78570923c1d AS official-geoip
FROM runtime AS updater
COPY --from=official-geoip /usr/bin/geoipupdate /usr/local/bin/geoipupdate
COPY --from=official-geoip /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build --chown=node:node /app/geoip-update.mjs ./geoip-update.mjs
HEALTHCHECK NONE
ENTRYPOINT ["node", "geoip-update.mjs"]

FROM runtime AS dbip-updater
COPY --from=build --chown=node:node /app/dbip-update.mjs ./dbip-update.mjs
ENV DBIP_DATABASE_DIR=/data/dbip
HEALTHCHECK NONE
ENTRYPOINT ["node", "dbip-update.mjs"]

# Default target remains the web app; updater explicitly uses --target updater.
FROM runtime AS web
