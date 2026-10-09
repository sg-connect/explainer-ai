import React from 'react';
import * as THREE from 'three';

// Toy-style 3D cast built from primitives — no model files to license or load.
// Every animation is a pure function of `frame`, so Remotion renders are
// deterministic frame by frame.
export type Pose = {
  frame: number;
  talk: number;        // 0..1 mouth opening from the voice envelope
  speaking: boolean;   // hop + head bob while talking
  cheer?: number;      // 0..1 celebration jump (e.g. "done" scenes)
  look?: number;       // head yaw in radians (towards the other character)
};

const M: React.FC<{ c: string; r?: number; e?: string }> = ({ c, r = 0.55, e }) => (
  <meshStandardMaterial color={c} roughness={r} metalness={0.02} emissive={e ?? '#000'} emissiveIntensity={e ? 0.25 : 0} />
);

// sphere helper: position, scale (ellipsoid), colour
const Ball: React.FC<{ p: [number, number, number]; s: [number, number, number] | number; c: string; r?: number; rot?: [number, number, number]; seg?: number }> =
  ({ p, s, c, r, rot, seg = 40 }) => (
    <mesh position={p} scale={typeof s === 'number' ? [s, s, s] : s} rotation={rot} castShadow>
      <sphereGeometry args={[1, seg, seg]} /><M c={c} r={r} />
    </mesh>
  );

const blinkScale = (frame: number, period: number, offset: number) => ((frame + offset) % period) < 4 ? 0.1 : 1;

const hop = (pose: Pose, speed: number) => {
  const talkHop = pose.speaking ? Math.abs(Math.sin(pose.frame / speed)) * 0.12 : 0;
  const idle = Math.sin(pose.frame / 18) * 0.02;
  const cheer = (pose.cheer ?? 0) * Math.abs(Math.sin(pose.frame / 5)) * 0.32;
  return talkHop + idle + cheer;
};

// --------------------------------------------------------------- Biscuit (dog)
export const Dog3D: React.FC<Pose> = (pose) => {
  const { frame, talk } = pose;
  const y = hop(pose, 4.5);
  const squash = 1 - (pose.speaking ? Math.abs(Math.sin(frame / 4.5)) * 0.04 : 0);
  const wag = Math.sin(frame / (pose.speaking || pose.cheer ? 2.2 : 4.5)) * 0.7;
  const ear = Math.sin(frame / 7) * (pose.speaking ? 0.18 : 0.06);
  const nod = pose.speaking ? Math.sin(frame / 6) * 0.08 : Math.sin(frame / 25) * 0.03;
  const blink = blinkScale(frame, 97, 0);
  const GOLD = '#E8A955', CREAM = '#FFF1DC', BROWN = '#7B4A22', DARK = '#2B1D12';
  return (
    <group position={[0, y, 0]} scale={[1, squash, 1]}>
      {/* tail */}
      <group position={[0, 0.95, -0.7]} rotation={[0.6, 0, wag]}>
        <mesh position={[0, 0.35, 0]} castShadow><capsuleGeometry args={[0.11, 0.55, 8, 16]} /><M c={GOLD} /></mesh>
      </group>
      {/* body + belly + legs */}
      <Ball p={[0, 0.95, 0]} s={[0.82, 0.78, 0.72]} c={GOLD} />
      <Ball p={[0, 0.85, 0.42]} s={[0.5, 0.5, 0.36]} c={CREAM} />
      {[-0.42, 0.42].map((x) => <Ball key={x} p={[x, 0.22, 0.32]} s={[0.24, 0.2, 0.32]} c={CREAM} />)}
      {[-0.5, 0.5].map((x) => <Ball key={x} p={[x, 0.3, -0.25]} s={[0.24, 0.24, 0.28]} c={GOLD} />)}
      {/* collar + tag */}
      <mesh position={[0, 1.55, 0.05]} rotation={[Math.PI / 2 - 0.15, 0, 0]} castShadow>
        <torusGeometry args={[0.5, 0.09, 16, 48]} /><M c="#E5484D" r={0.4} />
      </mesh>
      <mesh position={[0, 1.42, 0.58]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.04, 32]} /><meshStandardMaterial color="#FFC53D" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* head */}
      <group position={[0, 2.25, 0.05]} rotation={[nod, pose.look ?? 0, 0]}>
        <Ball p={[0, 0, 0]} s={[0.78, 0.72, 0.7]} c={GOLD} />
        {/* floppy ears */}
        <group position={[-0.62, 0.3, -0.18]} rotation={[0, 0, 0.3 + ear]}>
          <Ball p={[0, -0.3, 0]} s={[0.15, 0.4, 0.24]} c={BROWN} />
        </group>
        <group position={[0.62, 0.3, -0.18]} rotation={[0, 0, -0.3 - ear]}>
          <Ball p={[0, -0.3, 0]} s={[0.15, 0.4, 0.24]} c={BROWN} />
        </group>
        {/* muzzle, nose */}
        <Ball p={[0, -0.22, 0.55]} s={[0.42, 0.3, 0.3]} c={CREAM} />
        <Ball p={[0, -0.1, 0.84]} s={[0.13, 0.09, 0.08]} c={DARK} r={0.25} />
        {/* mouth: dark cavity that opens with the voice */}
        <Ball p={[0, -0.36, 0.78]} s={[0.14 + talk * 0.04, 0.02 + talk * 0.13, 0.06]} c="#4A1414" r={0.8} />
        {talk > 0.3 && <Ball p={[0, -0.42 - talk * 0.04, 0.8]} s={[0.08, 0.05, 0.05]} c="#FF7A8A" />}
        {/* eyes */}
        {[-0.27, 0.27].map((x) => (
          <group key={x} position={[x, 0.16, 0.56]} scale={[1, blink, 1]}>
            <Ball p={[0, 0, 0]} s={0.15} c="#ffffff" r={0.2} />
            <Ball p={[0.02, 0, 0.11]} s={0.085} c={DARK} r={0.2} />
            <Ball p={[0.05, 0.04, 0.18]} s={0.025} c="#ffffff" r={0.1} />
          </group>
        ))}
        {/* worried brows */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 0.27, 0.37, 0.58]} rotation={[0, 0, sd * -0.35]}>
            <capsuleGeometry args={[0.03, 0.16, 4, 8]} /><M c={BROWN} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------- Inspector Whiskers (cat)
export const Cat3D: React.FC<Pose> = (pose) => {
  const { frame, talk } = pose;
  const y = hop(pose, 5);
  const sway = Math.sin(frame / 12);
  const nod = pose.speaking ? Math.sin(frame / 7) * 0.07 : Math.sin(frame / 27) * 0.03;
  const blink = blinkScale(frame, 113, 47);
  const glassTilt = pose.speaking ? Math.sin(frame / 9) * 0.15 : 0;
  const GREY = '#7F8C9E', WHITE = '#F1F3F7', PINK = '#F5A3B5', DARK = '#2C3440', HAT = '#9C6B3C';
  // tail: spheres along an animated curve
  const tailCurve = new THREE.CatmullRomCurve3(Array.from({ length: 6 }, (_, i) => {
    const t = i / 5;
    return new THREE.Vector3(0.3 + Math.sin(t * 2.4 + sway * 0.7) * 0.5 * t, 0.4 + t * 1.3, -0.55 - t * 0.2);
  }));
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow><tubeGeometry args={[tailCurve, 40, 0.1, 12, false]} /><M c={GREY} /></mesh>
      <Ball p={tailCurve.getPoint(1).toArray() as [number, number, number]} s={0.12} c={DARK} seg={20} />
      <Ball p={[0, 0.9, 0]} s={[0.72, 0.8, 0.65]} c={GREY} />
      <Ball p={[0, 0.85, 0.38]} s={[0.42, 0.55, 0.32]} c={WHITE} />
      {[-0.35, 0.35].map((x) => <Ball key={x} p={[x, 0.2, 0.32]} s={[0.2, 0.18, 0.3]} c={WHITE} />)}
      {/* head */}
      <group position={[0, 2.15, 0.05]} rotation={[nod, pose.look ?? 0, 0]}>
        <Ball p={[0, 0, 0]} s={[0.74, 0.66, 0.66]} c={GREY} />
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.55, 0.62, -0.05]} rotation={[0, 0, sd * -0.6]}>
            <mesh castShadow><coneGeometry args={[0.24, 0.5, 4]} /><M c={GREY} /></mesh>
            <mesh position={[0, -0.04, 0.07]}><coneGeometry args={[0.14, 0.34, 4]} /><M c={PINK} /></mesh>
          </group>
        ))}
        {/* deerstalker */}
        <group position={[0, 0.42, 0]} rotation={[-0.12, 0, 0]}>
          <mesh castShadow><sphereGeometry args={[0.62, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><M c={HAT} r={0.8} /></mesh>
          <mesh position={[0, 0.02, 0.45]} rotation={[0.25, 0, 0]} scale={[1, 0.18, 0.6]} castShadow>
            <sphereGeometry args={[0.45, 24, 12]} /><M c="#7A5128" r={0.8} /></mesh>
          <Ball p={[0, 0.63, 0]} s={0.08} c="#7A5128" />
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <torusGeometry args={[0.6, 0.035, 8, 48]} /><M c="#C9955B" /></mesh>
        </group>
        <Ball p={[0, -0.22, 0.5]} s={[0.36, 0.24, 0.24]} c={WHITE} />
        <mesh position={[0, -0.1, 0.72]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.06, 0.07, 3]} /><M c="#F07C98" /></mesh>
        {/* whiskers */}
        {[-1, 1].flatMap((sd) => [0.02, -0.06].map((dy) => (
          <mesh key={`${sd}${dy}`} position={[sd * 0.42, -0.2 + dy, 0.62]} rotation={[0, 0, sd * (Math.PI / 2 + dy * 2)]}>
            <cylinderGeometry args={[0.008, 0.008, 0.42, 6]} /><M c={DARK} /></mesh>
        )))}
        <Ball p={[0, -0.3, 0.68]} s={[0.1 + talk * 0.04, 0.015 + talk * 0.11, 0.05]} c="#4A1420" r={0.8} />
        {/* eyes with slit pupils */}
        {[-0.26, 0.26].map((x) => (
          <group key={x} position={[x, 0.08, 0.5]} scale={[1, blink, 1]}>
            <Ball p={[0, 0, 0]} s={[0.16, 0.18, 0.12]} c="#D7F5C9" r={0.2} />
            <Ball p={[-0.02, 0, 0.09]} s={[0.045, 0.13, 0.05]} c="#1F2A1A" r={0.2} />
            <Ball p={[0.02, 0.06, 0.13]} s={0.025} c="#ffffff" r={0.1} />
          </group>
        ))}
        {/* one raised, suspicious brow */}
        <mesh position={[0.26, 0.33, 0.55]} rotation={[0, 0, 0.3]}><capsuleGeometry args={[0.025, 0.16, 4, 8]} /><M c={DARK} /></mesh>
        <mesh position={[-0.26, 0.27, 0.57]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.025, 0.16, 4, 8]} /><M c={DARK} /></mesh>
      </group>
      {/* magnifying glass, held up on the side facing the dog */}
      <group position={[-0.75, 1.3, 0.35]} rotation={[0.1, 0.4, 0.35 + glassTilt]}>
        <mesh position={[0, -0.35, 0]} castShadow><cylinderGeometry args={[0.05, 0.06, 0.6, 16]} /><M c="#5A3A1E" /></mesh>
        <mesh position={[0, 0.18, 0]} castShadow><torusGeometry args={[0.28, 0.05, 16, 48]} /><meshStandardMaterial color="#C9A227" metalness={0.7} roughness={0.25} /></mesh>
        <mesh position={[0, 0.18, 0]}><circleGeometry args={[0.27, 40]} />
          <meshPhysicalMaterial color="#BFE3FF" transparent opacity={0.35} roughness={0} transmission={0.6} side={THREE.DoubleSide} /></mesh>
        <Ball p={[0, -0.62, 0]} s={0.14} c={GREY} />
      </group>
    </group>
  );
};
