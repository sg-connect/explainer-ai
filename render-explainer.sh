#!/usr/bin/env bash
# Make a ByteByteGo-style explainer:  ./render-explainer.sh examples/explainer-demo [out.mp4]
#   1. narration — Kokoro TTS, local (tts/make_narration.py) → voice/vo.wav + timeline.json (word timings)
#   2. video     — Remotion renders the diagram, camera and messages in sync with the words
# Skip step 1 with SKIP_VOICES=1 when only the visuals changed (the "do" actions, diagram layout).
# Change any "say" text and step 1 must run again, or the word anchors drift.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dir="$(cd "$1" && pwd)"; name="$(basename "$dir")"
out="${2:-$dir/$name.mp4}"
[ "${SKIP_VOICES:-0}" = 1 ] || "$here/packages/tts/.venv/bin/python" "$here/packages/tts/make_narration.py" "$dir" 2>&1 | grep -vE "Warning|warn|deprecat" || true
pub="$("$here/scripts/stage.sh" "$dir")"   # its own public dir: renders can run side by side
cd "$here/packages/renderer"
npx remotion render src/index.ts Explainer "$out" --codec h264 --crf 18 --public-dir="$pub" --log error
echo "wrote $out"
