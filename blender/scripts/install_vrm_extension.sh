#!/usr/bin/env bash
# Install pinned VRM/MToon extension (NO character/model/media is imported).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="$REPO/blender/config/toolchain.json"
BIN="$REPO/.cache/blender/blender-4.5.16-linux-x64/blender"
test -x "$BIN"
URL="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["optional_addons"]["vrm"]["download_url"])' "$CONFIG")"
SHA="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["optional_addons"]["vrm"]["sha256"])' "$CONFIG")"
ARCHIVE="$REPO/.cache/blender/vrm-addon-4.10.5.zip"
mkdir -p "$(dirname "$ARCHIVE")"
if [[ ! -s "$ARCHIVE" ]]; then
  curl --fail --location --retry 3 --connect-timeout 20 "$URL" --output "$ARCHIVE.partial"
  mv "$ARCHIVE.partial" "$ARCHIVE"
fi
echo "$SHA  $ARCHIVE" | sha256sum -c -
echo "User extension repositories:"
"$BIN" --command extension repo-list
"$BIN" --command extension install-file --repo user_default --enable "$ARCHIVE"
