#!/bin/sh
set -eu
: "${IPINFO_LITE_MMDB_DIR:?Set the managed IPinfo database directory}"
: "${IPINFO_LITE_TOKEN_PATH:?Set the private download token file}"
: "${IPINFO_LITE_UPDATER_IMAGE:?Set an immutable updater image}"
if [ "${1:-}" != "--locked" ]; then
  exec flock -n -E 75 "$IPINFO_LITE_MMDB_DIR/.update.lock" "$0" --locked
fi
if docker container inspect ipinfo-lite-update >/dev/null 2>&1; then
  [ "$(docker inspect --format '{{index .Config.Labels "dog.ipinfo.role"}}' ipinfo-lite-update)" = "ipinfo-updater" ]
  docker rm -f ipinfo-lite-update >/dev/null
fi
exec docker run --rm --name ipinfo-lite-update --label dog.ipinfo.role=ipinfo-updater --user 1000:1000 \
  --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --mount "type=bind,src=$IPINFO_LITE_MMDB_DIR,dst=/data/ipinfo" \
  --mount "type=bind,src=$IPINFO_LITE_TOKEN_PATH,dst=/run/secrets/ipinfo_lite_token,readonly" \
  -e IPINFO_DATABASE_DIR=/data/ipinfo -e IPINFO_LITE_TOKEN_FILE=/run/secrets/ipinfo_lite_token \
  "$IPINFO_LITE_UPDATER_IMAGE"
