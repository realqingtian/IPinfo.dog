#!/bin/sh
set -eu
: "${IPINFO_MMDB_DIR:?Set the managed database directory}"
: "${IPINFO_GEOIP_CONF:?Set the private GeoIP configuration path}"
: "${IPINFO_UPDATER_IMAGE:?Set an immutable updater image}"
# OS lock is released even after a crash; no stale PID lock inside a container.
if [ "${1:-}" != "--locked" ]; then
  exec flock -n -E 75 "$IPINFO_MMDB_DIR/.update.lock" "$0" --locked
fi
# Recover only our own abandoned container after acquiring the same lock.
if docker container inspect ipinfo-geoip-update >/dev/null 2>&1; then
  [ "$(docker inspect --format '{{index .Config.Labels "dog.ipinfo.role"}}' ipinfo-geoip-update)" = "geoip-updater" ]
  docker rm -f ipinfo-geoip-update >/dev/null
fi
exec docker run --rm --name ipinfo-geoip-update --label dog.ipinfo.role=geoip-updater --user 1000:1000 \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --mount "type=bind,src=$IPINFO_MMDB_DIR,dst=/data/maxmind" \
  --mount "type=bind,src=$IPINFO_GEOIP_CONF,dst=/run/secrets/GeoIP-raelfang.conf,readonly" \
  -e GEOIP_DATABASE_DIR=/data/maxmind \
  -e GEOIPUPDATE_CONF_FILE=/run/secrets/GeoIP-raelfang.conf \
  "$IPINFO_UPDATER_IMAGE"
