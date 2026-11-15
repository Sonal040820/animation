#!/usr/bin/env bash
# Verified headless Blender install on Ubuntu x64; never renders media.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="$REPO/blender/config/toolchain.json"
VER="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["blender"]["version"])' "$CONFIG")"
ARCHIVE="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["blender"]["archive"])' "$CONFIG")"
URL="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["blender"]["url"])' "$CONFIG")"
CHECKSUM_URL="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["blender"]["checksums_url"])' "$CONFIG")"
CACHE="$(printenv BLENDER_CACHE_DIR || echo "$REPO/.cache/blender")"
INSTALL="$CACHE/blender-$VER-linux-x64"
mkdir -p "$CACHE"
if [[ -x "$INSTALL/blender" ]]; then
  echo "Blender cached at $INSTALL/blender"
  "$INSTALL/blender" --version | head -n 2
  exit 0
fi
echo "Installing Blender $VER from Blender Foundation (no rendering)"
cd "$CACHE"
curl --fail --location --retry 3 --connect-timeout 20 "$CHECKSUM_URL" -o "$VER.sha256"
EXPECTED="$(grep -F "$ARCHIVE" "$VER.sha256" | head -n 1 | awk '{print $1}')"
if [[ ! "$EXPECTED" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "Official SHA-256 entry missing for $ARCHIVE" >&2
  exit 1
fi
if [[ ! -f "$ARCHIVE" ]]; then
  curl --fail --location --retry 3 --connect-timeout 20 "$URL" -o "$ARCHIVE.partial"
  mv "$ARCHIVE.partial" "$ARCHIVE"
fi
ACTUAL="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "BLENDER ARCHIVE HASH MISMATCH. Refusing execution." >&2
  rm -f "$ARCHIVE"
  exit 1
fi
tar --extract --xz --file "$ARCHIVE" --directory "$CACHE" --no-same-owner
test -x "$INSTALL/blender"
"$INSTALL/blender" --version | head -n 2
echo "$INSTALL" > "$CACHE/path.txt"
