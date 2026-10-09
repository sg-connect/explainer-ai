#!/usr/bin/env bash
# Stage an explainer folder into its own Remotion public dir, so several
# explainers can be previewed or rendered at the same time.
#   scripts/stage.sh <explainer-folder>   → prints the public dir path
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dir="$(cd "$1" && pwd)"; name="$(basename "$dir")"
pub="$here/.cache/public/$name"
mkdir -p "$pub/explainer"
rm -rf "$pub/icons"; cp -R "$here/packages/renderer/public/icons" "$pub/icons"   # a copy: a symlinked public dir kept Remotion from exiting
cp "$dir/storyboard.json" "$dir/timeline.json" "$dir/voice/vo.wav" "$pub/explainer/"
echo "$pub"
