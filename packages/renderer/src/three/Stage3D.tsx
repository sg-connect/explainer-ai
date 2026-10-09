import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { interpolate, useVideoConfig, Easing } from 'remotion';
import { Cat3D, Dog3D } from './Characters3D';

export type StageProps = {
  frame: number;
  speaking: 'dog' | 'cat' | null;
  talkDog: number;
  talkCat: number;
  cheer: number;     // 0..1, both characters celebrate
  top: number;       // px from the top of the frame where the stage starts
  height: number;
};

// The camera prop only applies at creation, so a rig re-aims it every frame.
const Rig: React.FC<{ x: number; z: number }> = ({ x, z }) => {
  const { camera } = useThree();
  camera.position.set(x, 2.3, z);
  camera.lookAt(0, 1.35, 0);
  return null;
};

// Stage: camera, lights, shadow floor, and the two characters.
export const Stage3D: React.FC<StageProps> = ({ frame, speaking, talkDog, talkCat, cheer, top, height }) => {
  const { width } = useVideoConfig();
  // walk in from the sides over the first second
  const enter = interpolate(frame, [0, 32], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const walkBob = enter < 1 ? Math.abs(Math.sin(frame / 3)) * 0.25 : 0;
  const dogX = -1.55 - (1 - enter) * 4.5;
  const catX = 1.55 + (1 - enter) * 4.5;
  // slow handheld-style drift; continuous, so speaker changes never cause a jump
  const camX = Math.sin(frame / 95) * 0.45;
  const camZ = 11.2 + Math.sin(frame / 70) * 0.35;
  // characters turn towards whoever is talking
  const dogLook = speaking === 'cat' ? 0.35 : 0.15;
  const catLook = speaking === 'dog' ? -0.35 : -0.15;
  return (
    <div style={{ position: 'absolute', top, left: 0, width, height }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}
        camera={{ fov: 30, position: [0, 2.1, 9.2], near: 0.1, far: 100 }}>
        <Rig x={camX} z={camZ} />
        <hemisphereLight args={['#E9F5FF', '#E8C79A', 0.9]} />
        <directionalLight position={[3, 7, 5]} intensity={2.1} castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-radius={6} />
        <directionalLight position={[-4, 3, -4]} intensity={0.9} color="#BFD8FF" />
        <pointLight position={[0, 3, 4]} intensity={6} distance={12} color="#FFE6C2" />
        {/* shadow catcher: invisible floor that only shows shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} /><shadowMaterial opacity={0.28} />
        </mesh>
        <group position={[dogX, walkBob, 0]} rotation={[0, 0.38, 0]}>
          <Dog3D frame={frame} talk={talkDog} speaking={speaking === 'dog'} cheer={cheer} look={dogLook} />
        </group>
        <group position={[catX, walkBob, 0]} rotation={[0, -0.38, 0]}>
          <Cat3D frame={frame + 11} talk={talkCat} speaking={speaking === 'cat'} cheer={cheer} look={catLook} />
        </group>
      </ThreeCanvas>
    </div>
  );
};
