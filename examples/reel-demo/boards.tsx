import React from 'react';
import { BODY, C, Check, Cross, Heading, TITLE, fade, pop } from '@studio/ui';

// Evidence boards for the demo reel: one component per `scene` in script.json.

const Bar: React.FC<{ f: number; label: string; ms: number; max: number; color: string; at: number }> = ({ f, label, ms, max, color, at }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: fade(f, at) }}>
    <div style={{ ...BODY, fontSize: 36, width: 220, textAlign: 'right' }}>{label}</div>
    <div style={{ height: 64, width: 560 * (ms / max) * Math.min(1, pop(f, at)), background: color, borderRadius: 18 }} />
    <div style={{ ...TITLE, fontSize: 40 }}>{ms} ms</div>
  </div>
);

const Slow: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
    <Heading f={f}>Page load</Heading>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <Bar f={f} label="HTML" ms={120} max={4000} color={C.blue} at={10} />
      <Bar f={f} label="Prices" ms={3600} max={4000} color={C.red} at={22} />
      <Bar f={f} label="Images" ms={280} max={4000} color={C.blue} at={34} />
    </div>
  </div>
);

const Cause: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
    <Heading f={f}>Same question, every visit</Heading>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ ...TITLE, fontSize: 44, display: 'flex', alignItems: 'center', gap: 22, opacity: fade(f, 12 + i * 14) }}>
        <Cross size={54} /> SELECT * FROM prices
      </div>
    ))}
  </div>
);

const Fix: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
    <Heading f={f}>Cache it for 60 s</Heading>
    <div style={{ transform: `scale(${pop(f, 10)})` }}><Check size={150} /></div>
    <div style={{ ...TITLE, fontSize: 60, color: C.green, opacity: fade(f, 24) }}>4000 ms → 180 ms</div>
  </div>
);

export const BOARDS: Record<string, React.FC<{ f: number }>> = { slow: Slow, cause: Cause, fix: Fix };
