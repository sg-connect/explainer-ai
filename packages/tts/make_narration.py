"""Turn an explainer's storyboard.json into one narration track plus word timings.

    .venv/bin/python make_narration.py ../../examples/explainer-demo

Reads   <dir>/storyboard.json  {"narrator": {...}, "beats": [{"say", "do": [...]}, ...]}
Writes  <dir>/voice/vo.wav     every beat on one track, with pauses
        <dir>/timeline.json    each beat's start/end frame and every spoken word's
                               start/end frame — the video anchors actions to words

Kokoro runs locally; nothing leaves the machine.
"""
import json, re, sys, warnings
from pathlib import Path

import numpy as np
import soundfile as sf

warnings.filterwarnings("ignore")
SR, FPS = 24000, 30


def main(story_dir):
    from kokoro import KPipeline

    root = Path(story_dir)
    spec = json.loads((root / "storyboard.json").read_text())
    nar = spec.get("narrator", {})
    voice, speed = nar.get("voice", "am_michael"), nar.get("speed", 1.0)
    pipe = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M")
    (root / "voice").mkdir(exist_ok=True)

    lead, gap = spec.get("leadSeconds", 1.0), spec.get("gapSeconds", 0.45)
    track, beats, cursor = [np.zeros(int(lead * SR), np.float32)], [], int(lead * SR)
    for i, beat in enumerate(spec["beats"]):
        say = beat.get("say", "")
        hold = int(beat.get("holdSeconds", 0) * SR)
        words, parts, offset = [], [], 0
        if say:
            # Kokoro splits long text into chunks; token times are per chunk.
            for r in pipe(say, voice=voice, speed=speed):
                audio = r.audio.numpy() if hasattr(r.audio, "numpy") else r.audio
                for t in r.tokens or []:
                    if not re.search(r"\w", t.text):
                        if words and t.text.strip():
                            words[-1]["w"] += t.text.strip()  # keep punctuation for captions
                        continue
                    if t.start_ts is None:
                        continue
                    words.append({
                        "w": t.text,
                        "start": round((cursor + offset) / SR * FPS + t.start_ts * FPS),
                        "end": round((cursor + offset) / SR * FPS + t.end_ts * FPS),
                    })
                parts.append(audio.astype(np.float32))
                offset += len(audio)
        audio = np.concatenate(parts) if parts else np.zeros(0, np.float32)
        pause = int(beat.get("pauseAfter", gap) * SR) + hold
        track += [audio, np.zeros(pause, np.float32)]
        beats.append({
            "start": round(cursor / SR * FPS),
            "speechEnd": round((cursor + len(audio)) / SR * FPS),
            "end": round((cursor + len(audio) + pause) / SR * FPS),
            "words": words,
        })
        print(f"{i:02d} {len(audio) / SR:5.2f}s  {say[:70]}")
        cursor += len(audio) + pause

    track.append(np.zeros(int(spec.get("tailSeconds", 2.0) * SR), np.float32))
    full = np.concatenate(track)
    sf.write(root / "voice" / "vo.wav", full, SR)
    total = round(len(full) / SR * FPS)
    (root / "timeline.json").write_text(json.dumps({"fps": FPS, "totalFrames": total, "beats": beats}))
    print(f"total {len(full) / SR:.1f}s, {total} frames")


if __name__ == "__main__":
    main(sys.argv[1])
