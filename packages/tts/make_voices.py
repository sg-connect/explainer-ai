"""Turn a reel's script.json into voice clips and a timeline the animation reads.

    .venv/bin/python make_voices.py ../../examples/reel-demo

Reads   <reel>/script.json   {"cast": {...}, "lines": [{"who", "say", ...}]}
Writes  <reel>/voice/NN.wav  one clip per line, 24 kHz mono
        <reel>/voice/vo.wav  all lines on one track, with the gaps
        <reel>/timeline.json each line's start/duration in frames, plus a
                             per-frame loudness envelope (0..1) for mouth flaps

Kokoro runs locally; nothing leaves the machine. The first run downloads the
model (~330 MB) into the Hugging Face cache.
"""
import json, sys, warnings
from pathlib import Path

import numpy as np
import soundfile as sf

warnings.filterwarnings("ignore")
SR, FPS = 24000, 30


def pitch_shift(audio, semitones):
    """Cartoon pitch: resample, which also changes speed — compensated by
    the voice's `speed` in the cast, so keep shifts small (±3)."""
    if not semitones:
        return audio
    factor = 2 ** (semitones / 12)
    idx = np.arange(0, len(audio), factor)
    return np.interp(idx, np.arange(len(audio)), audio).astype(np.float32)


def envelope(audio):
    """RMS per video frame, normalised to 0..1 — drives the mouth."""
    hop = SR // FPS
    n = int(np.ceil(len(audio) / hop))
    rms = np.array([np.sqrt(np.mean(audio[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    peak = np.percentile(rms, 95) or 1.0
    return np.clip(rms / peak, 0, 1).round(3).tolist()


def main(reel_dir):
    from kokoro import KPipeline

    reel = Path(reel_dir)
    spec = json.loads((reel / "script.json").read_text())
    cast, lines = spec["cast"], spec["lines"]
    gap = spec.get("gapSeconds", 0.35)
    lead = spec.get("leadSeconds", 0.6)
    out = reel / "voice"
    out.mkdir(exist_ok=True)

    pipes = {}
    track, timeline, cursor = [], [], int(lead * SR)
    track.append(np.zeros(cursor, np.float32))
    for i, line in enumerate(lines):
        actor = cast[line["who"]]
        lang = actor["voice"][0]  # 'a' American, 'b' British
        pipe = pipes.setdefault(lang, KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M"))
        chunks = [a.numpy() if hasattr(a, "numpy") else a
                  for _, _, a in pipe(line["say"], voice=actor["voice"], speed=actor.get("speed", 1.0))]
        audio = pitch_shift(np.concatenate(chunks).astype(np.float32), actor.get("pitch", 0))
        sf.write(out / f"{i:02d}.wav", audio, SR)
        start = cursor
        track.append(audio)
        pause = int((line.get("pauseAfter", gap)) * SR)
        track.append(np.zeros(pause, np.float32))
        cursor += len(audio) + pause
        timeline.append({
            "who": line["who"],
            "startFrame": round(start / SR * FPS),
            "durationFrames": round(len(audio) / SR * FPS),
            "envelope": envelope(audio),
        })
        print(f"{i:02d} {line['who']:>4} {len(audio) / SR:5.2f}s  {line['say'][:60]}")

    tail = int(spec.get("tailSeconds", 1.5) * SR)
    track.append(np.zeros(tail, np.float32))
    full = np.concatenate(track)
    sf.write(out / "vo.wav", full, SR)
    total = round(len(full) / SR * FPS)
    (reel / "timeline.json").write_text(json.dumps({"fps": FPS, "totalFrames": total, "lines": timeline}))
    print(f"total {len(full) / SR:.2f}s, {total} frames")


if __name__ == "__main__":
    main(sys.argv[1])
