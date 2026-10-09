#!/usr/bin/env bash
# Make a vertical cartoon reel from a reel folder:  ./render-reel.sh examples/reel-demo [out.mp4]
# The folder holds script.json (who says what, per scene) and boards.tsx (one board per scene).
#   1. voices  — Kokoro TTS, local (tts/make_voices.py) → voice/vo.wav + timeline.json
#   2. video   — Remotion renders the characters + boards in sync with the voices
# Skip step 1 with SKIP_VOICES=1 when only visuals changed.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
reel="$(cd "$1" && pwd)"; name="$(basename "$reel")"
out="${2:-$reel/$name.mp4}"
[ "${SKIP_VOICES:-0}" = 1 ] || "$here/packages/tts/.venv/bin/python" "$here/packages/tts/make_voices.py" "$reel" 2>&1 | grep -vE "Warning|warn|deprecat" || true
mkdir -p "$here/packages/renderer/public/reel"
cp "$reel/script.json" "$reel/timeline.json" "$reel/voice/vo.wav" "$here/packages/renderer/public/reel/"
cd "$here/packages/renderer"
REEL_DIR="$reel" npx remotion render src/index.ts Reel "$out" --codec h264 --crf 20 --gl=angle --log error
echo "wrote $out"
