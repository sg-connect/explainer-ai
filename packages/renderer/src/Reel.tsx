import React from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from 'remotion';
// The reel's own boards: REEL_DIR/boards.tsx, wired in by remotion.config.ts.
import { BOARDS } from '@reel/boards';
import { Cat, Dog } from './characters';
import { Stage3D } from './three/Stage3D';
import { Office3D, Look } from './three/Office3D';

// `show` is the caption when it should differ from what is spoken (e.g. ticket keys).
// `ticket` is the short tag in the header (a ticket key, an episode number…);
// `screen` is up to three lines on the office wall screen.
export type Line = { who: string; scene: string; say: string; show?: string };
export type TimedLine = { who: string; startFrame: number; durationFrames: number; envelope: number[] };
export type ReelProps = {
  script: { title: string; headline?: string; ticket: string; screen?: string[]; style?: '2d' | '3d' | 'office'; cheerScenes?: string[]; cast: Record<string, { name: string; role: string; color?: string } & Partial<Look>>; lines: Line[] };
  timeline: { fps: number; totalFrames: number; lines: TimedLine[] };
};

const FONT_FUN = '"Chalkboard SE", "Comic Sans MS", "Avenir Next", sans-serif';
const FONT = '"Avenir Next", sans-serif';
const WHO_COLOR: Record<string, string> = { dog: '#E8AE62', cat: '#7D8A9B' };

// Which line is active at `frame`, and how far into it we are. Between lines
// the previous line stays "active" (bubble remains) until the next starts.
const activeLine = (lines: TimedLine[], frame: number) => {
  let idx = -1;
  lines.forEach((l, i) => { if (frame >= l.startFrame - 3) idx = i; });
  return idx;
};

const mouthAt = (line: TimedLine | undefined, frame: number) => {
  if (!line) return 0;
  const i = frame - line.startFrame;
  if (i < 0 || i >= line.envelope.length) return 0;
  // a little smoothing so the mouth doesn't flicker
  const e = line.envelope;
  const v = (e[i] * 2 + (e[i - 1] ?? 0) + (e[i + 1] ?? 0)) / 4;
  return Math.min(1, v * 1.15);
};

const Bubble: React.FC<{ text: string; who: string; name: string; progress: number; appear: number; top?: number; color?: string; role?: string }> =
  ({ text, who, name, progress, appear, top = 1060, color, role }) => {
    const words = text.split(' ');
    const shown = Math.max(1, Math.ceil(words.length * Math.min(1, progress * 1.08)));
    const left = who === 'dog';
    return (
      <div style={{ position: 'absolute', top, left: 60, right: 60, opacity: appear, zIndex: 10,
        transform: `translateY(${(1 - appear) * 30}px) scale(${0.96 + appear * 0.04})` }}>
        <div style={{ background: '#fff', borderRadius: 44, padding: '30px 40px', border: '6px solid #1E2433',
          boxShadow: '0 10px 0 rgba(30,36,51,0.18)', position: 'relative' }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, color: color ?? WHO_COLOR[who], textTransform: 'uppercase', letterSpacing: 2 }}>{name}{role && <span style={{ color: '#8A94A1', marginLeft: 12 }}>· {role}</span>}</div>
          <div style={{ fontFamily: FONT_FUN, fontWeight: 700, fontSize: text.length > 115 ? 38 : text.length > 85 ? 42 : 46, lineHeight: 1.2, color: '#1E2433', marginTop: 6 }}>
            {words.map((w, i) => <span key={i} style={{ opacity: i < shown ? 1 : 0.18 }}>{w} </span>)}
          </div>
          <svg width="80" height="60" style={{ position: 'absolute', bottom: -54, [left ? 'left' : 'right']: 170 }}>
            <path d={left ? 'M8 0 L 20 52 L 60 0' : 'M72 0 L 60 52 L 20 0'} fill="#fff" stroke="#1E2433" strokeWidth="6" strokeLinejoin="round" />
            <rect x="4" y="0" width="72" height="8" fill="#fff" /></svg>
        </div>
      </div>
    );
  };

export const Reel: React.FC<ReelProps> = ({ script, timeline }) => {
  const frame = useCurrentFrame();
  const idx = activeLine(timeline.lines, frame);
  const t = idx >= 0 ? timeline.lines[idx] : undefined;
  const line = idx >= 0 ? script.lines[idx] : undefined;
  const scene = line?.scene ?? script.lines[0].scene;
  const sceneStart = (() => {
    let s = 0;
    for (let i = 0; i <= Math.max(0, idx); i++) if (i === 0 || script.lines[i].scene !== script.lines[i - 1].scene) s = timeline.lines[i].startFrame;
    return Math.max(0, s - 8);
  })();
  const office = script.style === 'office';
  const Board = BOARDS[scene];
  const speaking = t && frame >= t.startFrame && frame < t.startFrame + t.durationFrames ? t.who : null;
  const talkDog = speaking === 'dog' ? mouthAt(t, frame) : 0;
  const talkCat = speaking === 'cat' ? mouthAt(t, frame) : 0;
  const boardIn = interpolate(frame - sceneStart, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const progress = t ? (frame - t.startFrame) / t.durationFrames : 0;
  const bubbleIn = t ? interpolate(frame - t.startFrame, [-3, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

  return (
    <AbsoluteFill style={{ background: office ? 'linear-gradient(180deg, #DDE6F0 0%, #EEF2F6 60%, #EEF2F6 100%)' : 'linear-gradient(180deg, #BFE3FF 0%, #E9F5FF 55%, #FFF4DE 100%)' }}>
      {/* drifting clouds */}
      {!office && [[120, 150, 0.6], [700, 90, 0.4], [420, 230, 0.5]].map(([x, y, sp], i) => (
        <div key={i} style={{ position: 'absolute', left: ((x + frame * sp) % 1300) - 200, top: y, width: 200, height: 70, borderRadius: 50,
          background: 'rgba(255,255,255,0.8)', boxShadow: '60px -24px 0 10px rgba(255,255,255,0.8)' }} />
      ))}
      {/* header */}
      <div style={{ position: 'absolute', top: 90, width: '100%', textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#1E2433', letterSpacing: 1 }}>
        <span style={{ background: '#1E2433', color: '#FFC53D', padding: '6px 18px', borderRadius: 14, marginRight: 14 }}>{script.ticket}</span>
        {script.headline ?? 'The case file'}
      </div>
      {/* evidence board */}
      <div style={{ position: 'absolute', top: office ? 175 : 200, left: 50, right: 50, height: office ? 710 : 820, borderRadius: 48, background: 'rgba(255,255,255,0.72)',
        border: '6px solid #1E2433', boxShadow: '0 12px 0 rgba(30,36,51,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: boardIn, transform: script.style === '3d'
          ? `perspective(1800px) rotateX(${3 + Math.sin(frame / 40) * 2}deg) rotateY(${Math.sin(frame / 55) * 3}deg) translateY(${Math.sin(frame / 30) * 6}px) scale(${0.97 + boardIn * 0.03})`
          : `scale(${0.97 + boardIn * 0.03})` }}>
        {Board && <Board f={frame - sceneStart} />}
      </div>
      {/* speech bubble */}
      {line && t && <Bubble text={line.show ?? line.say} who={line.who} name={script.cast[line.who].name} progress={progress} appear={bubbleIn}
        top={office ? 905 : 1060} color={script.cast[line.who].color} role={office ? script.cast[line.who].role : undefined} />}
      {/* floor */}
      {!office && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 330, background: 'linear-gradient(180deg, #F6D7A7, #EBC48A)' }} />}
      {/* characters */}
      {office ? (
        <Office3D frame={frame} screen={script.screen ?? [script.ticket, script.title]} cast={script.cast as Record<string, Look>} speaker={speaking} talk={speaking ? mouthAt(t, frame) : 0} top={1060} height={860} />
      ) : script.style === '3d' ? (
        <Stage3D frame={frame} speaking={speaking as 'dog' | 'cat' | null} talkDog={talkDog} talkCat={talkCat} top={1180} height={740}
          cheer={(script.cheerScenes ?? []).includes(scene) ? interpolate(frame - sceneStart, [20, 40, 120, 150], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0} />
      ) : (<>
      <div style={{ position: 'absolute', left: 50, top: 1345, width: 410, height: 510,
        transform: `rotate(${speaking === 'dog' ? 2 : 0}deg)` }}>
        <Dog frame={frame} talk={talkDog} speaking={speaking === 'dog'} />
      </div>
      <div style={{ position: 'absolute', right: 50, top: 1300, width: 400, height: 535,
        transform: `rotate(${speaking === 'cat' ? -2 : 0}deg)` }}>
        <Cat frame={frame} talk={talkCat} speaking={speaking === 'cat'} />
      </div>
      </>)}
      <Audio src={staticFile('reel/vo.wav')} />
    </AbsoluteFill>
  );
};
