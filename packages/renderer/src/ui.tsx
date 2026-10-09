import React from 'react';
import { interpolate, spring } from 'remotion';

// Shared building blocks for evidence boards. Each reel's boards live in
// reels/<TICKET>.tsx and map script.json scene ids to components.

export const C = {
  ink: '#1E2433', muted: '#6B7385', card: '#FFFFFF', line: '#E3E6EE',
  amber: '#F59E0B', green: '#16A34A', red: '#DC2626', blue: '#3B6FF5',
};
export const TITLE: React.CSSProperties = { fontFamily: '"Avenir Next", sans-serif', fontWeight: 800, color: C.ink };
export const BODY: React.CSSProperties = { fontFamily: '"Avenir Next", sans-serif', fontWeight: 600, color: C.muted };

export const pop = (f: number, at: number) => spring({ frame: f - at, fps: 30, config: { damping: 12, stiffness: 140 } });
export const fade = (f: number, at: number, len = 10) => interpolate(f, [at, at + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const Check: React.FC<{ size?: number; color?: string }> = ({ size = 56, color = C.green }) => (
  <svg width={size} height={size} viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" fill={color} />
    <path d="M17 31 L26 40 L44 21" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Cross: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" fill={C.red} />
    <path d="M20 20 L40 40 M40 20 L20 40" stroke="#fff" strokeWidth="7" strokeLinecap="round" /></svg>
);
export const Question: React.FC<{ size?: number; f: number }> = ({ size = 56, f }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" style={{ transform: `rotate(${Math.sin(f / 6) * 10}deg)` }}>
    <circle cx="30" cy="30" r="27" fill={C.amber} />
    <text x="30" y="42" textAnchor="middle" fontSize="36" fontWeight="900" fill="#fff" fontFamily="Avenir Next">?</text></svg>
);

export const Chip: React.FC<{ id: string; status?: React.ReactNode; border?: string; dim?: number; scale?: number }> =
  ({ id, status, border = C.line, dim = 1, scale = 1 }) => (
    <div style={{ width: 330, height: 130, borderRadius: 28, background: C.card, border: `6px solid ${border}`, opacity: dim,
      transform: `scale(${scale})`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
      boxSizing: 'border-box', boxShadow: '0 8px 0 rgba(30,36,51,0.08)' }}>
      <div><div style={{ ...BODY, fontSize: 26 }}>creative</div><div style={{ ...TITLE, fontSize: 46 }}>{id}</div></div>
      {status}
    </div>
  );

export const Heading: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => (
  <div style={{ ...TITLE, fontSize: 64, textAlign: 'center', opacity: fade(f, 0), transform: `translateY(${(1 - fade(f, 0)) * 20}px)` }}>{children}</div>
);

