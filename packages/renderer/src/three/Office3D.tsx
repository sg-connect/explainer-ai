import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { useVideoConfig } from 'remotion';

// A team office, built from primitives: desks in two rows, a standing lead,
// window light, plants. Each person is a toy-like figure whose look comes
// from script.json's cast (hair, colours, glasses) — nobody's real appearance
// is guessed; everyone shares one playful skin tone.

export type Look = {
  name: string; role: string; color: string;
  hair?: 'short' | 'long' | 'bun' | 'curly' | 'buzz' | 'ponytail';
  hairColor?: string; glasses?: boolean;
  seat: 'front-1' | 'front-2' | 'front-3' | 'back-1' | 'back-2' | 'back-3' | 'back-4' | 'stand';
};

const SKIN = '#F4C98B';
const M: React.FC<{ c: string; r?: number; m?: number }> = ({ c, r = 0.6, m = 0 }) => (
  <meshStandardMaterial color={c} roughness={r} metalness={m} />
);
const Ball: React.FC<{ p: [number, number, number]; s: number | [number, number, number]; c: string; r?: number }> = ({ p, s, c, r }) => (
  <mesh position={p} scale={typeof s === 'number' ? [s, s, s] : s} castShadow><sphereGeometry args={[1, 32, 24]} /><M c={c} r={r} /></mesh>
);
const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; c: string; r?: number; m?: number; rot?: [number, number, number] }> =
  ({ p, s, c, r, m, rot }) => (
    <mesh position={p} rotation={rot} castShadow receiveShadow><boxGeometry args={s} /><M c={c} r={r} m={m} /></mesh>
  );

const textTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

// desk nameplate, facing the camera from the desk's front edge
const NamePlate: React.FC<{ look: Look; active: boolean }> = ({ look, active }) => {
  const tex = useMemo(() => textTexture(512, 150, (g) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(4, 4, 504, 142, 26); g.fill();
    g.fillStyle = look.color; g.fillRect(4, 4, 18, 142);
    g.fillStyle = '#1E2433'; g.textAlign = 'center';
    g.font = '800 62px "Avenir Next", sans-serif'; g.fillText(look.name, 266, 72);
    g.fillStyle = '#5F6B77'; g.font = '600 34px "Avenir Next", sans-serif'; g.fillText(look.role, 266, 120);
  }), [look]);
  return (
    <mesh position={[0, 0.66, 0.735]}>
      <planeGeometry args={[0.92, 0.27]} />
      <meshStandardMaterial map={tex} emissive={active ? look.color : '#000'} emissiveIntensity={active ? 0.25 : 0} roughness={0.6} />
    </mesh>
  );
};

// name label that always faces the camera
const NameTag: React.FC<{ look: Look; y: number; active: boolean }> = ({ look, y, active }) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const g = c.getContext('2d')!;
    g.fillStyle = look.color; g.beginPath(); g.roundRect(8, 8, 496, 144, 72); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '800 64px "Avenir Next", sans-serif'; g.fillText(look.name, 256, 82);
    g.font = '600 36px "Avenir Next", sans-serif'; g.globalAlpha = 0.9; g.fillText(look.role, 256, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, [look]);
  const s = active ? 1.15 : 0.82;
  return (
    <sprite position={[0, y, 0]} scale={[1.1 * s, 0.344 * s, 1]}>
      <spriteMaterial map={tex} transparent opacity={active ? 1 : 0.82} depthWrite={false} />
    </sprite>
  );
};

const Hair: React.FC<{ kind: Look['hair']; c: string }> = ({ kind = 'short', c }) => {
  const cap = <mesh position={[0, 0.06, -0.02]} scale={[1.04, 1.0, 1.04]} castShadow>
    <sphereGeometry args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} /><M c={c} r={0.8} /></mesh>;
  switch (kind) {
    case 'buzz': return <mesh position={[0, 0.04, -0.01]} castShadow><sphereGeometry args={[0.365, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.4]} /><M c={c} r={0.9} /></mesh>;
    case 'long': return <group>{cap}<Ball p={[0, -0.12, -0.16]} s={[0.36, 0.42, 0.24]} c={c} r={0.8} /></group>;
    case 'bun': return <group>{cap}<Ball p={[0, 0.36, -0.14]} s={0.13} c={c} r={0.8} /></group>;
    case 'ponytail': return <group>{cap}<Ball p={[0, 0.05, -0.38]} s={[0.1, 0.1, 0.1]} c={c} r={0.8} /><Ball p={[0, -0.17, -0.42]} s={[0.1, 0.24, 0.1]} c={c} r={0.8} /></group>;
    case 'curly': return <group>{cap}{[[-0.2, 0.25, 0.05], [0.2, 0.25, 0.05], [0, 0.33, 0], [-0.3, 0.12, -0.05], [0.3, 0.12, -0.05], [0, 0.22, -0.25]].map((p, i) =>
      <Ball key={i} p={p as [number, number, number]} s={0.13} c={c} r={0.9} />)}</group>;
    default: return cap;
  }
};

export type PersonPose = { frame: number; talk: number; speaking: boolean; lookAtX: number; selfX: number; standing?: boolean };

const Person: React.FC<{ look: Look } & PersonPose> = ({ look, frame, talk, speaking, lookAtX, selfX, standing }) => {
  const seed = look.name.length * 17;
  const blink = ((frame + seed * 7) % (90 + seed % 40)) < 4 ? 0.12 : 1;
  const breathe = Math.sin((frame + seed) / 22) * 0.012;
  const bob = speaking ? Math.abs(Math.sin(frame / 4.8)) * 0.05 : 0;
  // turn the head towards whoever is talking
  const yaw = speaking ? Math.sin(frame / 30) * 0.15 : Math.max(-0.6, Math.min(0.6, (lookAtX - selfX) * 0.22));
  const nod = speaking ? Math.sin(frame / 6) * 0.06 : Math.sin((frame + seed) / 40) * 0.03;
  const gesture = speaking ? 0.9 + Math.sin(frame / 7) * 0.35 : 0;
  const baseY = standing ? 1.05 : 0.62;
  return (
    <group position={[0, baseY + breathe + bob, 0]}>
      {standing && <>
        <mesh position={[-0.12, -0.55, 0]} castShadow><capsuleGeometry args={[0.09, 0.62, 8, 16]} /><M c="#2E3440" /></mesh>
        <mesh position={[0.12, -0.55, 0]} castShadow><capsuleGeometry args={[0.09, 0.62, 8, 16]} /><M c="#2E3440" /></mesh>
      </>}
      {/* torso */}
      <mesh position={[0, 0.3, 0]} castShadow><capsuleGeometry args={[0.26, 0.38, 8, 24]} /><M c={look.color} r={0.7} /></mesh>
      {/* arms: right one gestures while talking */}
      <group position={[-0.3, 0.48, 0.02]} rotation={[0.5, 0, 0.2]}>
        <mesh position={[0, -0.22, 0]} castShadow><capsuleGeometry args={[0.075, 0.34, 8, 12]} /><M c={look.color} r={0.7} /></mesh>
        <Ball p={[0, -0.44, 0]} s={0.08} c={SKIN} />
      </group>
      <group position={[0.3, 0.48, 0.02]} rotation={[0.5 + gesture, 0, -0.2 - gesture * 0.25]}>
        <mesh position={[0, -0.22, 0]} castShadow><capsuleGeometry args={[0.075, 0.34, 8, 12]} /><M c={look.color} r={0.7} /></mesh>
        <Ball p={[0, -0.44, 0]} s={0.08} c={SKIN} />
      </group>
      {/* head */}
      <group position={[0, 0.98, 0]} rotation={[nod, yaw, 0]}>
        <Ball p={[0, 0, 0]} s={[0.35, 0.37, 0.34]} c={SKIN} r={0.55} />
        <Ball p={[-0.35, -0.02, 0]} s={0.07} c={SKIN} /><Ball p={[0.35, -0.02, 0]} s={0.07} c={SKIN} />
        <Hair kind={look.hair} c={look.hairColor ?? '#3B2A20'} />
        {[-0.12, 0.12].map((x) => (
          <group key={x} position={[x, 0.03, 0.3]} scale={[1, blink, 1]}>
            <Ball p={[0, 0, 0]} s={0.06} c="#fff" r={0.2} />
            <Ball p={[0, 0, 0.04]} s={0.035} c="#1E1A16" r={0.2} />
          </group>
        ))}
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.13 + (speaking ? Math.sin(frame / 9) * 0.012 : 0), 0.31]} rotation={[0, 0, x > 0 ? -0.1 : 0.1]}>
            <capsuleGeometry args={[0.014, 0.08, 4, 8]} /><M c="#3B2A20" /></mesh>
        ))}
        {look.glasses && [-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.03, 0.335]}><torusGeometry args={[0.075, 0.012, 8, 24]} /><M c="#222" r={0.3} /></mesh>
        ))}
        <Ball p={[0, -0.04, 0.34]} s={[0.03, 0.025, 0.02]} c="#E0A878" />
        {/* mouth: a smile at rest, opens with the voice */}
        {talk > 0.06
          ? <Ball p={[0, -0.15, 0.31]} s={[0.07 + talk * 0.02, 0.012 + talk * 0.055, 0.03]} c="#5A1E1E" r={0.8} />
          : <mesh position={[0, -0.14, 0.315]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.055, 0.012, 8, 16, Math.PI]} /><M c="#7A3B2E" /></mesh>}
      </group>
      {(speaking || standing) && <NameTag look={look} y={1.62} active={speaking} />}
    </group>
  );
};

// desk with a small laptop seen from behind (screen faces the person)
const Desk: React.FC = () => (
  <group>
    <Box p={[0, 0.74, 0.42]} s={[1.15, 0.06, 0.62]} c="#D9B38C" r={0.5} />
    {[[-0.52, 0.2], [0.52, 0.2], [-0.52, 0.66], [0.52, 0.66]].map(([x, z], i) => (
      <Box key={i} p={[x, 0.37, z]} s={[0.05, 0.72, 0.05]} c="#8A6A4B" />
    ))}
    <Box p={[0.15, 0.785, 0.42]} s={[0.36, 0.02, 0.25]} c="#9AA3AE" m={0.4} r={0.3} />
    <Box p={[0.15, 0.9, 0.3]} s={[0.36, 0.23, 0.015]} c="#5C6670" m={0.4} r={0.3} rot={[0.25, 0, 0]} />
    <mesh position={[-0.28, 0.83, 0.5]} castShadow><cylinderGeometry args={[0.05, 0.045, 0.1, 16]} /><M c="#ffffff" /></mesh>
  </group>
);

const Plant: React.FC<{ p: [number, number, number]; frame: number }> = ({ p, frame }) => (
  <group position={p}>
    <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.22, 0.17, 0.5, 20]} /><M c="#C8643C" /></mesh>
    {[[0, 0.75, 0, 0.3], [-0.18, 0.62, 0.05, 0.22], [0.17, 0.66, -0.04, 0.22], [0.02, 1.0, 0.02, 0.2]].map(([x, y, z, s], i) => (
      <Ball key={i} p={[x + Math.sin(frame / 50 + i) * 0.01, y, z]} s={s} c={i % 2 ? '#4E9F5B' : '#3E8A4E'} r={0.8} />
    ))}
  </group>
);

const WallScreen: React.FC<{ lines: string[] }> = ({ lines }) => {
  const tex = useMemo(() => textTexture(1020, 420, (g) => {
    const grd = g.createLinearGradient(0, 0, 1020, 420); grd.addColorStop(0, '#2F5BEA'); grd.addColorStop(1, '#1E3FA8');
    g.fillStyle = grd; g.fillRect(0, 0, 1020, 420);
    g.fillStyle = '#FFC53D'; g.font = '800 70px "Avenir Next", sans-serif'; g.textAlign = 'center'; g.fillText(lines[0] ?? '', 510, 160);
    g.fillStyle = '#ffffff'; g.font = '700 64px "Avenir Next", sans-serif'; g.fillText(lines[1] ?? '', 510, 260);
    g.globalAlpha = 0.8; g.font = '600 40px "Avenir Next", sans-serif'; g.fillText(lines[2] ?? '', 510, 330);
  }), [lines.join('\n')]);
  return <mesh position={[0, 3.0, -3.1]}><planeGeometry args={[3.4, 1.4]} /><meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55} /></mesh>;
};

const SEATS: Record<Look['seat'], [number, number, number]> = {
  'back-1': [-2.85, 0.32, -1.6], 'back-2': [-0.95, 0.32, -1.6], 'back-3': [0.95, 0.32, -1.6], 'back-4': [2.85, 0.32, -1.6],
  'front-1': [-1.9, 0, 0.6], 'front-2': [0, 0, 0.6], 'front-3': [1.9, 0, 0.6], 'stand': [2.95, 0, 2.05],
};

const Rig: React.FC<{ frame: number }> = ({ frame }) => {
  const { camera } = useThree();
  camera.position.set(0.4 + Math.sin(frame / 120) * 0.5, 4.1, 10.8 + Math.sin(frame / 90) * 0.25);
  camera.lookAt(0.4, 1.25, -0.2);
  return null;
};

export const Office3D: React.FC<{ frame: number; screen: string[]; cast: Record<string, Look>; speaker: string | null; talk: number; top: number; height: number }> =
  ({ frame, screen, cast, speaker, talk, top, height }) => {
    const { width } = useVideoConfig();
    const speakerX = speaker && cast[speaker] ? SEATS[cast[speaker].seat][0] : 0;
    return (
      <div style={{ position: 'absolute', top, left: 0, width, height }}>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }} camera={{ fov: 34, position: [0, 4, 10], near: 0.1, far: 100 }}>
          <Rig frame={frame} />
          <hemisphereLight args={['#FFF6E8', '#B8A48C', 1.0]} />
          <directionalLight position={[5, 8, 6]} intensity={1.9} castShadow shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} />
          <directionalLight position={[-6, 4, 2]} intensity={0.6} color="#CFE3FF" />
          {/* floor, back wall, window, skirting */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 20]} /><M c="#E9D6BC" r={0.9} /></mesh>
          <mesh position={[0, 3, -3.2]} receiveShadow><planeGeometry args={[30, 8]} /><M c="#EEF2F6" r={0.95} /></mesh>
          <mesh position={[-3.6, 2.6, -3.18]}><planeGeometry args={[2.4, 1.9]} /><meshStandardMaterial color="#CFE8FF" emissive="#BFE0FF" emissiveIntensity={0.5} /></mesh>
          <Box p={[-3.6, 2.6, -3.17]} s={[0.06, 1.9, 0.04]} c="#FFFFFF" />
          <Box p={[-3.6, 2.6, -3.17]} s={[2.4, 0.06, 0.04]} c="#FFFFFF" />
          <Box p={[0, 3.0, -3.15]} s={[3.6, 1.6, 0.08]} c="#1E2433" r={0.4} />
          <WallScreen lines={screen} />
          <Box p={[0, 0.06, -3.15]} s={[30, 0.12, 0.05]} c="#C9B193" />
          {/* raised platform for the back row */}
          <Box p={[0, 0.16, -1.25]} s={[8.4, 0.32, 1.9]} c="#DCC5A6" r={0.9} />
          <Plant p={[4.6, 0, -2.4]} frame={frame} />
          <Plant p={[-4.7, 0, 0.4]} frame={frame + 30} />
          {Object.entries(cast).map(([id, look]) => {
            const [x, y, z] = SEATS[look.seat];
            const standing = look.seat === 'stand';
            return (
              <group key={id} position={[x, y, z]} rotation={[0, standing ? -0.45 : 0, 0]}>
                {!standing && <Desk />}
                {!standing && <NamePlate look={look} active={speaker === id} />}
                {!standing && <Box p={[0, 0.45, -0.32]} s={[0.55, 0.08, 0.5]} c="#3B4252" />}
                <group position={[0, standing ? 0 : 0, standing ? 0 : -0.25]}>
                  <Person look={look} frame={frame} talk={speaker === id ? talk : 0} speaking={speaker === id}
                    lookAtX={speakerX} selfX={x} standing={standing} />
                </group>
              </group>
            );
          })}
        </ThreeCanvas>
      </div>
    );
  };
