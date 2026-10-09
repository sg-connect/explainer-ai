import React from 'react';

// Shared animation inputs for both characters.
//   frame   current frame (drives blink, idle sway, tail)
//   talk    0..1 mouth opening for this frame (from the voice envelope)
//   speaking whether this character has the line (bounce + lean)
export type CharacterProps = { frame: number; talk: number; speaking: boolean };

// Blink for ~4 frames every `period` frames, offset so the two never blink together.
const blink = (frame: number, period: number, offset: number) => {
  const p = (frame + offset) % period;
  return p < 4 ? 0.12 : 1;
};

// ------------------------------------------------------------------ Biscuit
// Golden dog, floppy ears, red collar. Faces right, towards the cat.
export const Dog: React.FC<CharacterProps> = ({ frame, talk, speaking }) => {
  const eye = blink(frame, 97, 0);
  const bounce = speaking ? Math.abs(Math.sin(frame / 4.5)) * 10 : Math.sin(frame / 20) * 2;
  const wag = Math.sin(frame / (speaking ? 2.6 : 5)) * (speaking ? 22 : 12);
  const ear = Math.sin(frame / 6) * (speaking ? 6 : 2);
  const mouth = 4 + talk * 34;
  const tilt = speaking ? Math.sin(frame / 14) * 3 : 0;
  return (
    <svg viewBox="0 0 420 520" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <ellipse cx="210" cy="505" rx="150" ry="16" fill="rgba(0,0,0,0.18)" />
      <g transform={`translate(0 ${-bounce})`}>
        {/* tail */}
        <g transform={`rotate(${wag} 90 380)`}>
          <path d="M95 385 C 40 360, 30 300, 55 270" stroke="#D99A4E" strokeWidth="28" fill="none" strokeLinecap="round" />
        </g>
        {/* body */}
        <ellipse cx="210" cy="400" rx="128" ry="105" fill="#E8AE62" />
        <ellipse cx="225" cy="420" rx="70" ry="68" fill="#FFF3E0" />
        {/* legs */}
        <rect x="120" y="455" width="56" height="52" rx="26" fill="#E8AE62" />
        <rect x="250" y="455" width="56" height="52" rx="26" fill="#E8AE62" />
        <ellipse cx="148" cy="503" rx="34" ry="13" fill="#FFF3E0" />
        <ellipse cx="278" cy="503" rx="34" ry="13" fill="#FFF3E0" />
        {/* collar + tag */}
        <path d="M120 300 Q 215 345 305 295" stroke="#E5484D" strokeWidth="22" fill="none" strokeLinecap="round" />
        <circle cx="222" cy="338" r="15" fill="#FFC53D" stroke="#C98F0A" strokeWidth="3" />
        {/* head */}
        <g transform={`rotate(${tilt} 215 190)`}>
          <g transform={`rotate(${-12 + ear} 105 120)`}>
            <ellipse cx="100" cy="185" rx="42" ry="92" fill="#8B5A2B" />
          </g>
          <g transform={`rotate(${12 - ear} 325 120)`}>
            <ellipse cx="330" cy="185" rx="42" ry="92" fill="#8B5A2B" />
          </g>
          <circle cx="215" cy="175" r="122" fill="#E8AE62" />
          <ellipse cx="240" cy="225" rx="78" ry="58" fill="#FFF3E0" />
          {/* eyes */}
          {[160, 268].map((x) => (
            <g key={x} transform={`translate(${x} 148) scale(1 ${eye})`}>
              <ellipse cx="0" cy="0" rx="25" ry="29" fill="#fff" />
              <circle cx="8" cy="3" r="15" fill="#2B1D12" />
              <circle cx="13" cy="-4" r="5" fill="#fff" />
            </g>
          ))}
          {/* worried brows */}
          <path d="M132 105 Q 160 92 185 108" stroke="#6B4220" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M245 108 Q 270 92 298 105" stroke="#6B4220" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* nose */}
          <ellipse cx="250" cy="200" rx="26" ry="18" fill="#2B1D12" />
          <ellipse cx="243" cy="194" rx="8" ry="5" fill="#5A4636" />
          {/* mouth */}
          <path d="M250 218 L250 232" stroke="#2B1D12" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="250" cy={236 + mouth / 2} rx={22 + talk * 6} ry={mouth / 2} fill="#5B1A1A" />
          {talk > 0.25 && <ellipse cx="250" cy={236 + mouth * 0.8} rx="13" ry={mouth * 0.28} fill="#FF7A8A" />}
        </g>
      </g>
    </svg>
  );
};

// --------------------------------------------------------- Inspector Whiskers
// Grey detective cat with a deerstalker and magnifying glass. Faces left.
export const Cat: React.FC<CharacterProps> = ({ frame, talk, speaking }) => {
  const eye = blink(frame, 113, 47);
  const bounce = speaking ? Math.abs(Math.sin(frame / 5)) * 8 : Math.sin(frame / 22 + 1) * 2;
  const sway = Math.sin(frame / 12) * 10;
  const glass = speaking ? Math.sin(frame / 9) * 6 : 0;
  const mouth = 3 + talk * 28;
  const tilt = speaking ? Math.sin(frame / 15) * -3 : 0;
  return (
    <svg viewBox="0 0 420 560" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <ellipse cx="210" cy="545" rx="140" ry="16" fill="rgba(0,0,0,0.18)" />
      <g transform={`translate(0 ${-bounce})`}>
        {/* tail */}
        <g transform={`rotate(${sway} 320 470)`}>
          <path d="M315 470 C 400 450, 410 360, 365 330" stroke="#6E7A8A" strokeWidth="26" fill="none" strokeLinecap="round" />
          <path d="M376 342 C 372 336, 368 332, 365 330" stroke="#4A5462" strokeWidth="26" fill="none" strokeLinecap="round" />
        </g>
        {/* body */}
        <ellipse cx="205" cy="445" rx="118" ry="100" fill="#7D8A9B" />
        <ellipse cx="195" cy="460" rx="62" ry="70" fill="#F1F3F7" />
        <rect x="118" y="495" width="54" height="50" rx="26" fill="#7D8A9B" />
        <rect x="235" y="495" width="54" height="50" rx="26" fill="#7D8A9B" />
        <ellipse cx="145" cy="542" rx="32" ry="12" fill="#F1F3F7" />
        <ellipse cx="262" cy="542" rx="32" ry="12" fill="#F1F3F7" />
        {/* head */}
        <g transform={`rotate(${tilt} 200 230)`}>
          <polygon points="95,160 115,40 190,120" fill="#7D8A9B" />
          <polygon points="112,140 122,70 168,118" fill="#F5A3B5" />
          <polygon points="305,160 290,40 215,120" fill="#7D8A9B" />
          <polygon points="290,140 283,70 238,118" fill="#F5A3B5" />
          <circle cx="200" cy="215" r="118" fill="#7D8A9B" />
          <ellipse cx="185" cy="262" rx="70" ry="50" fill="#F1F3F7" />
          {/* deerstalker */}
          <path d="M92 150 Q 200 40 310 150 Z" fill="#A0703F" />
          <path d="M92 150 Q 200 40 310 150" stroke="#7A5128" strokeWidth="6" fill="none" />
          <path d="M150 105 Q 200 80 250 105" stroke="#C9955B" strokeWidth="6" fill="none" />
          <path d="M120 128 Q 200 92 282 128" stroke="#C9955B" strokeWidth="6" fill="none" />
          <path d="M70 150 Q 200 175 330 150 Q 200 160 70 150 Z" fill="#7A5128" />
          <circle cx="200" cy="72" r="10" fill="#7A5128" />
          {/* eyes — pupils look left, at the dog */}
          {[150, 245].map((x) => (
            <g key={x} transform={`translate(${x} 205) scale(1 ${eye})`}>
              <ellipse cx="0" cy="0" rx="27" ry="30" fill="#D7F5C9" />
              <ellipse cx="-7" cy="2" rx="9" ry="22" fill="#1F2A1A" />
              <circle cx="-2" cy="-8" r="5" fill="#fff" />
            </g>
          ))}
          {/* one raised, suspicious brow */}
          <path d="M218 162 Q 245 148 272 165" stroke="#3E4652" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M125 175 L 175 172" stroke="#3E4652" strokeWidth="7" strokeLinecap="round" />
          {/* nose, whiskers, mouth */}
          <polygon points="172,242 196,242 184,256" fill="#F07C98" />
          {[[-1, 248], [-1, 262], [1, 248], [1, 262]].map(([side, y], i) => (
            <line key={i} x1={184 + side * 40} y1={y} x2={184 + side * 115} y2={y + (y > 250 ? 10 : -6)} stroke="#3E4652" strokeWidth="3" />
          ))}
          <path d="M162 266 Q 173 278 184 266 Q 195 278 206 266" stroke="#3E4652" strokeWidth="5" fill="none" strokeLinecap="round" />
          {talk > 0.05 && <ellipse cx="184" cy={274 + mouth / 2} rx={14 + talk * 6} ry={mouth / 2} fill="#5B1A2A" />}
        </g>
        {/* magnifying glass */}
        <g transform={`rotate(${-20 + glass} 70 360)`}>
          <rect x="62" y="330" width="16" height="110" rx="8" fill="#5A3A1E" />
          <circle cx="70" cy="295" r="52" fill="rgba(180,220,255,0.35)" stroke="#C9A227" strokeWidth="12" />
          <path d="M45 275 Q 55 260 72 258" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.8" />
          <circle cx="70" cy="420" r="22" fill="#7D8A9B" />
        </g>
      </g>
    </svg>
  );
};
