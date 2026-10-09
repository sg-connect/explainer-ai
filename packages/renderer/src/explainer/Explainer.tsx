import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { boxCam, Cam, edgePath, NODE_H, NODE_W, partialD, pointAt, Poly } from './geometry';
import { latest, schedule, Timed } from './schedule';
import { DGroup, DNode, ExplainerProps, Kind, Tone } from './types';

// A ByteByteGo-style explainer: one diagram that builds up while the narrator
// talks, a camera that moves to the part being explained, arrows that draw
// themselves, and message chips that travel along them. Everything is driven
// by storyboard.json actions anchored to spoken words (see schedule.ts).

const FONT = '"Avenir Next", "Helvetica Neue", sans-serif';
const MONO = '"SF Mono", Menlo, monospace';
const INK = '#1C2230';
const MUTED = '#6B7385';
const BG = '#F6F7FB';
const ARROW = '#3A4252';
const FLOW = '#3B82F6';

const TONES: Record<Tone, { fill: string; stroke: string; ink: string }> = {
  purple: { fill: '#EEEAFF', stroke: '#8F7FEE', ink: '#5B3FD0' },
  blue: { fill: '#E3EEFF', stroke: '#659DF2', ink: '#305BAB' },
  teal: { fill: '#E2F6F9', stroke: '#4FC1D6', ink: '#1A7A8C' },
  yellow: { fill: '#FFF6D1', stroke: '#E5B931', ink: '#8A6200' },
  gray: { fill: '#F0F1F4', stroke: '#A9AFBB', ink: '#3A3F4A' },
  orange: { fill: '#FDE9D7', stroke: '#FE9F4D', ink: '#9B4A08' },
  green: { fill: '#DDF6E7', stroke: '#2DC75C', ink: '#067429' },
};
const CHIP = { amber: '#E8930C', green: '#16A34A', red: '#DC2626', blue: '#3B6FF5' };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const pop = (f: number, at: number, fps: number) => spring({ frame: f - at, fps, config: { damping: 14, stiffness: 150 } });
const icon = (name: string) => staticFile(`icons/${name}.svg`);

const Glyph: React.FC<{ kind: Kind; color: string }> = ({ kind, color }) => {
  const p = { fill: 'none', stroke: color, strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {kind === 'client' && <><rect x="4" y="7" width="32" height="26" rx="4" {...p} /><path d="M4 14 H36" {...p} /><circle cx="9" cy="10.5" r="1.2" fill={color} /><circle cx="13" cy="10.5" r="1.2" fill={color} /></>}
      {kind === 'service' && <><path d="M20 4 L34 12 V28 L20 36 L6 28 V12 Z" {...p} /><circle cx="20" cy="20" r="5" {...p} /></>}
      {kind === 'db' && <><ellipse cx="20" cy="9" rx="13" ry="5" {...p} /><path d="M7 9 V31 C7 34 13 36 20 36 C27 36 33 34 33 31 V9" {...p} /><path d="M7 20 C7 23 13 25 20 25 C27 25 33 23 33 20" {...p} /></>}
      {kind === 'queue' && <><rect x="3" y="11" width="34" height="18" rx="9" {...p} /><rect x="9" y="15" width="5" height="10" rx="1.5" fill={color} /><rect x="17.5" y="15" width="5" height="10" rx="1.5" fill={color} /><rect x="26" y="15" width="5" height="10" rx="1.5" fill={color} opacity="0.45" /></>}
      {kind === 'render' && <><rect x="5" y="7" width="30" height="26" rx="4" {...p} /><path d="M9 28 L17 19 L23 25 L27 21 L32 27" {...p} /><circle cx="27" cy="14" r="2.6" {...p} /></>}
      {kind === 'cloud' && <path d="M12 31 H29 A7 7 0 0 0 29 17 A9 9 0 0 0 12 15 A8 8 0 0 0 12 31 Z" {...p} />}
    </svg>
  );
};

// Messages waiting in a queue, drawn inside the queue card.
const QueueSlots: React.FC<{ count: number; color: string }> = ({ count, color }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, display: 'flex', justifyContent: 'center', gap: 7 }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ width: 26, height: 10, borderRadius: 3, background: i < count ? color : 'rgba(0,0,0,0.07)',
        transform: `scaleY(${i < count ? 1 : 0.6})` }} />
    ))}
  </div>
);

const NodeCard: React.FC<{ n: DNode; appear: number; dim: number; queued: number }> = ({ n, appear, dim, queued }) => {
  const t = TONES[n.tone];
  const cloud = n.kind === 'cloud';
  return (
    <div style={{
      position: 'absolute', left: n.x - NODE_W / 2, top: n.y - NODE_H / 2, width: NODE_W, height: NODE_H,
      opacity: Math.min(1, appear) * dim, transform: `scale(${0.6 + 0.4 * appear})`,
      background: '#fff', borderRadius: n.kind === 'queue' ? NODE_H / 2 : 24,
      border: `3px ${cloud ? 'dashed' : 'solid'} ${t.stroke}`,
      boxShadow: '0 12px 28px rgba(28,34,48,0.10), 0 2px 6px rgba(28,34,48,0.06)',
      display: 'flex', alignItems: 'center', gap: 18, padding: n.kind === 'queue' ? '0 30px 18px' : '0 22px', boxSizing: 'border-box',
    }}>
      <div style={{ width: 70, height: 70, borderRadius: 18, background: t.fill, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {n.icon ? <Img src={icon(n.icon)} style={{ width: 46, height: 46 }} /> : <Glyph kind={n.kind} color={t.ink} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 27, lineHeight: 1.12, color: INK }}>{n.label}</div>
        {n.sub && <div style={{ fontFamily: MONO, fontSize: 15.5, lineHeight: 1.25, color: t.ink, marginTop: 7, wordBreak: 'break-word' }}>{n.sub}</div>}
      </div>
      {n.kind === 'queue' && <QueueSlots count={queued} color={t.stroke} />}
      {n.tech && (
        <div style={{ position: 'absolute', top: -20, right: 18, display: 'flex', gap: 8 }}>
          {n.tech.map((tk) => (
            <div key={tk} style={{ width: 42, height: 42, borderRadius: 21, background: '#fff', border: '2px solid #E3E6EE',
              boxShadow: '0 4px 10px rgba(28,34,48,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Img src={icon(tk)} style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const groupBox = (g: DGroup, byId: Record<string, DNode>) => {
  const ms = g.members.map((m) => byId[m]).filter(Boolean);
  const pad = g.pad ?? 46, top = g.padTop ?? 78;
  const x0 = Math.min(...ms.map((n) => n.x)) - NODE_W / 2 - pad;
  const x1 = Math.max(...ms.map((n) => n.x)) + NODE_W / 2 + pad;
  const y0 = Math.min(...ms.map((n) => n.y)) - NODE_H / 2 - top;
  const y1 = Math.max(...ms.map((n) => n.y)) + NODE_H / 2 + pad;
  return { x0, y0, x1, y1 };
};

const GroupFrame: React.FC<{ g: DGroup; byId: Record<string, DNode>; appear: number; dim: number }> = ({ g, byId, appear, dim }) => {
  const b = groupBox(g, byId);
  return (
    <div style={{
      position: 'absolute', left: b.x0, top: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0, opacity: appear * dim,
      border: `3px ${g.dashed === false ? 'solid' : 'dashed'} ${g.color}`, borderRadius: 34, background: `${g.color}0D`,
      transform: `scale(${0.97 + 0.03 * appear})`, transformOrigin: 'top left', boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', top: -26, left: 28, display: 'flex', alignItems: 'center', gap: 12, background: '#fff',
        border: `3px solid ${g.color}`, borderRadius: 999, padding: '6px 20px 6px 10px', boxShadow: '0 6px 14px rgba(28,34,48,0.08)' }}>
        {g.icon && <Img src={icon(g.icon)} style={{ width: 34, height: 34, objectFit: 'contain' }} />}
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 24, color: INK, whiteSpace: 'nowrap' }}>{g.label}</span>
      </div>
    </div>
  );
};

const Chip: React.FC<{ n: DNode; text: string; tone: keyof typeof CHIP; appear: number; f: number }> = ({ n, text, tone, appear, f }) => (
  <div style={{
    position: 'absolute', left: n.x, top: n.y - NODE_H / 2 - 34, transform: `translate(-50%, -50%) scale(${appear})`,
    background: CHIP[tone], color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 21, letterSpacing: 1.2,
    padding: '9px 20px 9px 14px', borderRadius: 999, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 10,
    boxShadow: `0 8px 20px ${CHIP[tone]}55`, zIndex: 5,
  }}>
    <svg width="22" height="22" viewBox="0 0 22 22">
      {tone === 'green' && <path d="M5 11.5 L9.5 16 L17 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {tone === 'red' && <path d="M6 6 L16 16 M16 6 L6 16" stroke="#fff" strokeWidth="3" strokeLinecap="round" />}
      {tone === 'amber' && <circle cx="11" cy="11" r="7.5" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="30 18" transform={`rotate(${f * 12} 11 11)`} />}
      {tone === 'blue' && <><circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2.5" fill="none" /><path d="M11 10 V15.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><circle cx="11" cy="6.8" r="1.5" fill="#fff" /></>}
    </svg>
    {text}
  </div>
);

const Note: React.FC<{ n: DNode; text: string; tone?: keyof typeof CHIP; appear: number }> = ({ n, text, tone, appear }) => (
  <div style={{
    position: 'absolute', left: n.x, top: n.y + NODE_H / 2 + 14, opacity: appear,
    transform: `translate(-50%, ${(1 - appear) * 14}px)`, zIndex: 5,
    background: tone ? CHIP[tone] : INK, color: '#fff', fontFamily: MONO, fontWeight: 600, fontSize: 19,
    padding: '8px 16px', borderRadius: 12, whiteSpace: 'nowrap', boxShadow: '0 8px 18px rgba(28,34,48,0.18)',
  }}>{text}</div>
);

const Bulb: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="15" fill="#FDE68A" />
    <path d="M15 7 a6 6 0 0 0 -3.6 10.8 V20 h7.2 V17.8 A6 6 0 0 0 15 7 Z" fill="#B45309" />
    <rect x="12" y="21.5" width="6" height="2.2" rx="1" fill="#B45309" />
  </svg>
);

const camAt = (focus: Timed[], f: number, all: Cam, fit: (a: Timed) => Cam): Cam => {
  const D = 32;
  const lerp = (a: Cam, b: Cam, t: number): Cam => ({
    cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, s: a.s * Math.pow(b.s / a.s, t),
  });
  let from = all, to = all, t0 = -1e9;
  for (const e of focus) {
    if (e.frame > f) break;
    from = lerp(from, to, ease(Math.min(1, (e.frame - t0) / D)));
    to = fit(e);
    t0 = e.frame;
  }
  return lerp(from, to, ease(Math.min(1, Math.max(0, (f - t0) / D))));
};

export const Explainer: React.FC<ExplainerProps> = ({ story, timeline }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { nodes, edges } = story.diagram;
  const groups = story.diagram.groups ?? [];
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const edgeById = useMemo(() => Object.fromEntries(edges.map((e) => [e.id, e])), [edges]);
  const paths = useMemo(() => Object.fromEntries(edges.map((e) => [e.id, edgePath(e, byId)])) as Record<string, Poly>, [edges, byId]);
  const acts = useMemo(() => schedule(story, timeline), [story, timeline]);
  const packets = useMemo(() => acts.filter((a) => a.packet).map((a) => ({ ...a, end: a.frame + Math.round((a.dur ?? 1.2) * fps) })), [acts, fps]);
  const principles = useMemo(() => acts.filter((a) => a.principle).map((a) => a.principle!), [acts]);
  const logos = useMemo(() => [...new Set(nodes.flatMap((n) => [...(n.tech ?? []), ...(n.icon ? [n.icon] : [])]))], [nodes]);

  // --- state at this frame -------------------------------------------------
  const shownAt: Record<string, number> = {};
  const drawnAt: Record<string, number> = {};
  for (const a of acts) {
    if (a.frame > f) break;
    a.show?.forEach((id) => (shownAt[id] ??= a.frame));
    a.group?.forEach((id) => (shownAt['g:' + id] ??= a.frame));
    if (a.draw) drawnAt[a.draw] ??= a.frame;
  }

  const overview = acts.find((a) => a.overview);
  const ghost = overview
    ? interpolate(f, [overview.frame, overview.frame + 14, overview.beatEnd - 16, overview.beatEnd], [0, 1, 1, 0], clamp)
    : 0;

  const spot = latest(acts, f, (a) => ('spot' in a ? a.spot ?? null : undefined));
  const spotIn = spot ? interpolate(f, [spot.frame, spot.frame + 12], [0, 1], clamp) : 0;
  const dimFor = (id: string) => {
    if (!spot || spot.value === null) return 1;
    return spot.value.includes(id) ? 1 : 1 - 0.72 * spotIn;
  };

  const principle = latest(acts, f, (a) => a.principle);
  const pIn = principle && f <= principle.act.beatEnd
    ? interpolate(f, [principle.frame, principle.frame + 18, principle.act.beatEnd - 14, principle.act.beatEnd], [0, 1, 1, 0], { ...clamp, easing: ease })
    : 0;

  // the camera, shifted left and pulled back while a principle card is up
  const all = boxCam('all', nodes, W, H);
  const base = camAt(acts.filter((a) => a.focus), f, all, (a) => boxCam(a.focus!, nodes, W, H));
  const cam = { ...base, s: base.s * (1 - 0.2 * pIn) };
  const shiftX = -260 * pIn;

  const title = acts.find((a) => a.title);
  const titleVis = title ? interpolate(f, [title.beatEnd - 18, title.beatEnd], [1, 0], clamp) : 0;
  const recap = latest(acts, f, (a) => a.recap);
  const outro = latest(acts, f, (a) => a.outro);
  const outroIn = outro ? interpolate(f, [outro.frame, outro.frame + 20], [0, 1], { ...clamp, easing: ease }) : 0;
  const recapIn = recap ? interpolate(f, [recap.frame, recap.frame + 16], [0, 1], clamp) * (1 - outroIn) : 0;

  // queue depth: packets that arrived at a queue minus packets that left it
  const queued = (id: string) => Math.max(0,
    packets.filter((p) => edgeById[p.packet!].to === id && f >= p.end).length -
    packets.filter((p) => edgeById[p.packet!].from === id && f >= p.frame).length);

  // the beat being spoken, for captions
  const beatIdx = timeline.beats.findIndex((b) => f >= b.start && f < b.end);
  const words = useMemo(
    () => (beatIdx >= 0 ? fixCaptions(timeline.beats[beatIdx].words, story.captionFix ?? {}) : []),
    [beatIdx, timeline, story.captionFix],
  );

  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden' }}>
      <Audio src={staticFile('explainer/vo.wav')} />
      {/* dotted paper */}
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(#D9DDE7 1.4px, transparent 1.4px)', backgroundSize: '30px 30px', opacity: 0.7 }} />

      {/* the world, moved by the camera */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 2600, height: 1300, transformOrigin: '0 0',
        transform: `translate(${W / 2 + shiftX - cam.cx * cam.s}px, ${H / 2 - cam.cy * cam.s}px) scale(${cam.s})`,
        opacity: (1 - titleVis) * (1 - 0.55 * recapIn) * (1 - outroIn),
      }}>
        {groups.map((g) => {
          const at = shownAt['g:' + g.id];
          const appear = Math.max(at !== undefined ? interpolate(f, [at, at + 18], [0, 1], { ...clamp, easing: ease }) : 0, ghost);
          return appear > 0 ? <GroupFrame key={g.id} g={g} byId={byId} appear={appear} dim={spot?.value ? 1 - 0.5 * spotIn : 1} /> : null;
        })}

        <svg width={2600} height={1300} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <defs>
            <marker id="head" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M1 1 L11 6 L1 11 Z" fill={ARROW} />
            </marker>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
          </defs>
          {edges.map((e) => {
            const p = paths[e.id];
            const drawn = drawnAt[e.id] !== undefined ? interpolate(f, [drawnAt[e.id], drawnAt[e.id] + 20], [0, 1], { ...clamp, easing: ease }) : 0;
            const prog = Math.max(drawn, ghost > 0 ? 1 : 0);
            const op = (drawn > 0 ? 1 : ghost) * dimFor(e.id);
            if (prog <= 0 || op <= 0) return null;
            const mid = pointAt(p, 0.5);
            const badge = e.step && drawn > 0 ? pop(f, drawnAt[e.id] + 10, fps) : 0;
            // flowing dashes while a message travels this edge
            const live = packets.filter((k) => k.packet === e.id && f >= k.frame - 6 && f <= k.end + 6);
            const flow = live.length ? Math.max(...live.map((k) => interpolate(f, [k.frame - 6, k.frame + 4, k.end - 4, k.end + 6], [0, 1, 1, 0], clamp))) : 0;
            const d = partialD(p, prog);
            return (
              <g key={e.id} opacity={op}>
                <path d={d} fill="none" stroke={ARROW} strokeWidth={4} strokeLinecap="round"
                  strokeDasharray={e.dashed ? '12 11' : undefined} markerEnd={prog > 0.97 ? 'url(#head)' : undefined} />
                {flow > 0 && <>
                  <path d={d} fill="none" stroke={FLOW} strokeWidth={14} opacity={0.18 * flow} filter="url(#glow)" />
                  <path d={d} fill="none" stroke={FLOW} strokeWidth={6} strokeLinecap="round" strokeDasharray="3 17"
                    strokeDashoffset={-f * 2.4} opacity={flow} />
                </>}
                {badge > 0 && (
                  <g transform={`translate(${mid.x},${mid.y}) scale(${badge})`}>
                    <circle r={21} fill={INK} stroke="#fff" strokeWidth={4} />
                    <text y={8} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={22} fill="#fff">{e.step}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {nodes.map((n) => {
          const appear = Math.max(shownAt[n.id] !== undefined ? pop(f, shownAt[n.id], fps) : 0, ghost);
          return appear > 0.001 ? <NodeCard key={n.id} n={n} appear={appear} dim={dimFor(n.id)} queued={queued(n.id)} /> : null;
        })}

        {/* a ring pulses out of the node a message just reached */}
        {packets.filter((p) => f >= p.end && f <= p.end + 22).map((p, i) => {
          const n = byId[edgeById[p.packet!].to];
          // no ring around a card that hasn't appeared yet
          if (ghost === 0 && (shownAt[n.id] === undefined || shownAt[n.id] > p.end)) return null;
          const t = (f - p.end) / 22;
          return (
            <div key={'r' + i} style={{
              position: 'absolute', left: n.x - NODE_W / 2, top: n.y - NODE_H / 2, width: NODE_W, height: NODE_H,
              borderRadius: n.kind === 'queue' ? NODE_H / 2 : 24, border: `4px solid ${FLOW}`, opacity: (1 - t) * 0.8,
              transform: `scale(${1 + 0.12 * Math.sqrt(t)})`, boxSizing: 'border-box',
            }} />
          );
        })}

        {/* travelling messages */}
        {packets.filter((a) => f >= a.frame && f <= a.end).map((a, i) => {
          const t = ease((f - a.frame) / (a.end - a.frame));
          const pt = pointAt(paths[a.packet!], t);
          const fade = interpolate(t, [0, 0.08, 0.9, 1], [0, 1, 1, 0], clamp);
          return (
            <div key={i} style={{
              position: 'absolute', left: pt.x, top: pt.y, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * fade})`, opacity: fade, zIndex: 6,
              background: INK, color: '#fff', fontFamily: MONO, fontWeight: 600, fontSize: 19, padding: '8px 14px',
              borderRadius: 10, whiteSpace: 'nowrap', boxShadow: `0 10px 22px rgba(28,34,48,0.28), 0 0 0 3px ${FLOW}55`,
              display: 'flex', alignItems: 'center', gap: 9,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: '#7DD3FC' }} />{a.label}
            </div>
          );
        })}

        {nodes.map((n) => {
          const note = latest(acts, f, (a) => (a.note === n.id ? a : undefined));
          if (!note || f > note.value.beatEnd) return null;
          const appear = interpolate(f, [note.frame, note.frame + 10, note.value.beatEnd - 10, note.value.beatEnd], [0, 1, 1, 0], clamp);
          return <Note key={'n' + n.id} n={n} text={note.value.text ?? ''} tone={note.value.tone} appear={appear} />;
        })}
        {nodes.map((n) => {
          const chip = latest(acts, f, (a) => (a.chip === n.id ? a : undefined));
          if (!chip || !chip.value.text) return null;
          return <Chip key={'c' + n.id} n={n} text={chip.value.text} tone={chip.value.tone ?? 'blue'} appear={pop(f, chip.frame, fps)} f={f} />;
        })}
      </div>

      {/* system design principle */}
      {pIn > 0 && principle && (
        <div style={{
          position: 'absolute', right: 44, top: 100, width: 500, opacity: pIn, transform: `translateX(${(1 - pIn) * 80}px)`,
          background: '#fff', borderRadius: 26, padding: '30px 34px', boxShadow: '0 24px 60px rgba(28,34,48,0.16)', borderTop: '8px solid #F59E0B',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 800, fontSize: 19, letterSpacing: 3, color: '#B45309' }}>
            <Bulb /> SYSTEM DESIGN PRINCIPLE
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 34, color: INK, marginTop: 16, lineHeight: 1.1 }}>{principle.value.name}</div>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 23, color: MUTED, marginTop: 12, lineHeight: 1.35 }}>{principle.value.text}</div>
        </div>
      )}

      {/* title card */}
      {titleVis > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: titleVis }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: '#3B6FF5', textTransform: 'uppercase',
            opacity: interpolate(f, [title!.frame, title!.frame + 15], [0, 1], clamp) }}>{story.series}</div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 92, color: INK, marginTop: 22, textAlign: 'center', maxWidth: 1500, lineHeight: 1.05,
            transform: `translateY(${(1 - pop(f, title!.frame + 6, fps)) * 40}px)`, opacity: pop(f, title!.frame + 6, fps) }}>{story.title}</div>
          {story.subtitle && <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 36, color: MUTED, marginTop: 26,
            opacity: interpolate(f, [title!.frame + 20, title!.frame + 35], [0, 1], clamp) }}>{story.subtitle}</div>}
          <div style={{ display: 'flex', gap: 22, marginTop: 60 }}>
            {logos.map((l, i) => {
              const a = pop(f, title!.frame + 40 + i * 4, fps);
              return (
                <div key={l} style={{ width: 76, height: 76, borderRadius: 20, background: '#fff', boxShadow: '0 10px 24px rgba(28,34,48,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
                  <Img src={icon(l)} style={{ width: 46, height: 46, objectFit: 'contain' }} />
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* recap */}
      {recap && recapIn > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: recapIn }}>
          <div style={{ background: '#fff', borderRadius: 32, padding: '50px 64px', boxShadow: '0 30px 70px rgba(28,34,48,0.18)', minWidth: 1000 }}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: '#3B6FF5', textTransform: 'uppercase', marginBottom: 26 }}>Recap</div>
            {recap.value.map((item, i) => {
              const words = timeline.beats[recap.act.beat].words;
              const anchor = recap.act.recapAt?.[i]?.toLowerCase();
              const at = words.find((w) => w.start >= recap.frame && w.w.toLowerCase().replace(/[^a-z0-9]/g, '') === anchor)?.start ?? recap.frame + i * 20;
              const a = pop(f, at, fps);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, margin: '18px 0', opacity: 0.18 + 0.82 * a, transform: `translateX(${a * 12}px)` }}>
                  <div style={{ width: 58, height: 58, borderRadius: 29, background: INK, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 46, color: INK }}>{item}</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* outro: every principle from this episode, and what comes next */}
      {outro && outroIn > 0 && (
        <AbsoluteFill style={{ opacity: outroIn, padding: '90px 110px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: '#B45309', textTransform: 'uppercase' }}>The principles behind it</div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 60, color: INK, marginTop: 10 }}>What to remember</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 30px', marginTop: 40 }}>
            {principles.map((p, i) => {
              const a = pop(f, outro.frame + 10 + i * 7, fps);
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 20, padding: '20px 26px', boxShadow: '0 12px 30px rgba(28,34,48,0.09)',
                  display: 'flex', gap: 18, alignItems: 'flex-start', opacity: a, transform: `translateY(${(1 - a) * 24}px)` }}>
                  <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 22, background: '#FEF3C7', color: '#B45309', fontFamily: FONT, fontWeight: 800,
                    fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                  <div>
                    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 27, color: INK }}>{p.name}</div>
                    <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, color: MUTED, marginTop: 4, lineHeight: 1.3 }}>{p.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {outro.value.next && (
            <div style={{ position: 'absolute', left: 110, right: 110, bottom: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              opacity: interpolate(f, [outro.frame + 60, outro.frame + 80], [0, 1], clamp) }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: '#3B6FF5', textTransform: 'uppercase' }}>{story.series}</div>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, color: INK, background: '#fff', borderRadius: 999, padding: '14px 30px',
                boxShadow: '0 10px 24px rgba(28,34,48,0.10)' }}>Next → {outro.value.next}</div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* captions */}
      {story.captions !== false && words.length > 0 && titleVis === 0 && (
        <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - outroIn }}>
          <div style={{ maxWidth: 1500, background: 'rgba(28,34,48,0.82)', borderRadius: 14, padding: '12px 26px', fontFamily: FONT, fontWeight: 600,
            fontSize: 31, lineHeight: 1.35, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
            {captionWindow(words, f).map((w, i) => (
              <span key={i} style={{ color: f >= w.start ? '#fff' : undefined }}>{w.w} </span>
            ))}
          </div>
        </div>
      )}

      {/* header + progress */}
      {titleVis === 0 && outroIn < 1 && (
        <div style={{ position: 'absolute', top: 26, left: 32, fontFamily: FONT, fontWeight: 700, fontSize: 22, color: MUTED, letterSpacing: 1, opacity: 1 - outroIn,
          background: 'rgba(246,247,251,0.92)', padding: '8px 16px', borderRadius: 12, zIndex: 20, boxShadow: '0 4px 14px rgba(28,34,48,0.06)' }}>
          <span style={{ color: '#3B6FF5' }}>●</span>&nbsp; {story.title}
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 6, width: `${(f / timeline.totalFrames) * 100}%`, background: '#3B6FF5' }} />
    </AbsoluteFill>
  );
};

// The narration spells some names the way they should sound ("Signal R");
// captionFix maps those word runs back to how they are written ("SignalR").
const fixCaptions = (words: { w: string; start: number; end: number }[], fix: Record<string, string>) => {
  const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  const rules = Object.entries(fix).map(([k, v]) => ({ parts: k.split(' ').map(bare), v }));
  const out: typeof words = [];
  for (let i = 0; i < words.length; i++) {
    const r = rules.find(({ parts }) => parts.every((p, j) => words[i + j] && bare(words[i + j].w) === p));
    if (!r) { out.push(words[i]); continue; }
    const last = words[i + r.parts.length - 1];
    const trail = last.w.match(/[^\w]+$/)?.[0] ?? '';
    out.push({ w: r.v + trail, start: words[i].start, end: last.end });
    i += r.parts.length - 1;
  }
  return out;
};

// Show the spoken words around the current one, about one line's worth, so
// long beats don't fill the screen.
const captionWindow = (words: { w: string; start: number; end: number }[], f: number) => {
  const PER = 14;
  let cur = words.findIndex((w) => w.start > f);
  if (cur < 0) cur = words.length;
  const page = Math.floor(Math.max(0, cur - 1) / PER);
  return words.slice(page * PER, page * PER + PER);
};
