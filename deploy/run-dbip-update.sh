#!/bin/sh
set -eu
: "${IPINFO_DBIP_UPDATER_IMAGE:?Set the tested dbip-updater image}"
: "${IPINFO_DBIP_DIR:?Set a writable DB-IP directory outside the checkout}"
# flock in the unit prevents overlap. No web tokens or MaxMind configuration are mounted.
exec docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL --security-opt no-new-privileges:true \
  -v "$IPINFO_DBIP_DIR:/data/dbip:rw" "$IPINFO_DBIP_UPDATER_IMAGE"
