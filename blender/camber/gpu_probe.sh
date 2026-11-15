#!/usr/bin/env bash
# Runs inside a Camber Xsmall GPU job. No token is needed inside this compute job.
set -euo pipefail
unset CAMBER_API_KEY || true
cd "$(dirname "$0")"
if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "GPU_ALLOC_FAIL: NVIDIA driver interface missing"
  exit 20
fi
if ! nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader; then
  echo "GPU_ALLOC_FAIL: NVIDIA GPU query failed"
  exit 21
fi
echo "GPU_ALLOC_PASS"

VER="4.5.16"
ARCHIVE="blender-$VER-linux-x64.tar.xz"
BASE="https://download.blender.org/release/Blender4.5"
mkdir -p .cache/blender
cd .cache/blender
if [[ ! -x "blender-$VER-linux-x64/blender" ]]; then
  echo "Installing checksum-verified Blender $VER"
  curl --fail --location --retry 2 --connect-timeout 20 --max-time 240 \
    "$BASE/blender-$VER.sha256" --output blender.sha256
  EXPECTED="$(grep -F "$ARCHIVE" blender.sha256 | awk '{print $1}' | head -n 1)"
  [[ "$EXPECTED" =~ ^[a-fA-F0-9]{64}$ ]] || { echo "Missing official Blender checksum"; exit 22; }
  curl --fail --location --retry 2 --connect-timeout 20 --max-time 360 \
    "$BASE/$ARCHIVE" --output "$ARCHIVE"
  echo "$EXPECTED  $ARCHIVE" | sha256sum --check --status ||
    { echo "Blender official checksum mismatch"; exit 23; }
  tar -xJf "$ARCHIVE"
  rm -f "$ARCHIVE"
fi
cd ../..
BLENDER_BIN="$(pwd)/.cache/blender/blender-$VER-linux-x64/blender"
if [[ ! -x "$BLENDER_BIN" ]]; then
  echo "BLENDER_UNAVAILABLE: no verified binary"
  exit 24
fi
"$BLENDER_BIN" --version | head -n 2
export BLENDER_USER_CONFIG="$(pwd)/.blender-user-config"
mkdir -p "$BLENDER_USER_CONFIG"
"$BLENDER_BIN" --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python cycles_probe.py
[[ -s gpu_probe_result.json && -s gpu_probe.png ]] ||
  { echo "RENDER_OUTPUT_MISSING"; exit 25; }
echo "GPU_PROBE_PASS"
