#!/usr/bin/env bash
# Render a few frames of an explainer to look at:  scripts/stills.sh <folder> <frame> [frame…]
# Frames land in <folder>/.stills/f<frame>.png. Needs voice/vo.wav + timeline.json (run the narration first).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dir="$(cd "$1" && pwd)"; shift
pub="$("$here/scripts/stage.sh" "$dir")"
mkdir -p "$dir/.stills"
cd "$here/packages/renderer"
for fr in "$@"; do
  npx remotion still src/index.ts Explainer "$dir/.stills/f$fr.png" --frame="$fr" --public-dir="$pub" --log error
  echo "$dir/.stills/f$fr.png"
done
