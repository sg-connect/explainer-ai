import { Action, Storyboard, Timeline } from './types';

export type Timed = Action & { frame: number; beat: number; beatEnd: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Every action with the frame it fires on: the start of its anchor word,
// plus `delay` seconds. An anchor that is not spoken falls back to the beat
// start and is reported in the console so the storyboard can be fixed.
export const schedule = (story: Storyboard, tl: Timeline): Timed[] => {
  const out: Timed[] = [];
  story.beats.forEach((beat, i) => {
    const tb = tl.beats[i];
    if (!tb) return;
    for (const a of beat.do ?? []) {
      let frame = tb.start;
      if (a.at) {
        const [word, nth] = a.at.split('#');
        const hits = tb.words.filter((w) => norm(w.w).startsWith(norm(word)));
        const hit = hits[(Number(nth) || 1) - 1];
        if (hit) frame = hit.start;
        else console.warn(`beat ${i}: anchor "${a.at}" is not spoken`);
      }
      const at = frame + Math.round((a.delay ?? 0) * tl.fps);
      // a stream of packets: same message, staggered
      const n = a.packet ? a.count ?? 1 : 1;
      for (let k = 0; k < n; k++) out.push({ ...a, frame: at + k * Math.round(0.4 * tl.fps), beat: i, beatEnd: tb.end });
    }
  });
  return out.sort((a, b) => a.frame - b.frame);
};

// The latest action at or before `f` that `pick` cares about.
export const latest = <T,>(acts: Timed[], f: number, pick: (a: Timed) => T | undefined) => {
  let found: { value: T; frame: number; act: Timed } | undefined;
  for (const a of acts) {
    if (a.frame > f) break;
    const v = pick(a);
    if (v !== undefined) found = { value: v, frame: a.frame, act: a };
  }
  return found;
};
