import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import * as THREE from 'three';
import { useGLTF, Center } from '@react-three/drei';
import type { RaceAnimal } from '../game/types';

const DEG2RAD = Math.PI / 180;

export interface Animal3DProps {
  animal: RaceAnimal;
  color?: string;
  modelUrl?: string;           // optional GLB
  scale?: number;              // model scale
  yawOffsetDeg?: number;       // facing offset in degrees
  idleAnim?: string;           // preferred clip names
  walkAnim?: string;
  runAnim?: string;
}

/* ---------------- GLB renderer (no conditional hooks) ---------------- */
function GLBAnimal({
  animal,
  modelUrl,
  scale = 1,
  yawOffsetDeg = 0,
  idleAnim = 'Idle',
  walkAnim = 'Walk',
  runAnim = 'Gallop',
}: Required<Pick<Animal3DProps,
  'animal' | 'modelUrl' | 'scale' | 'yawOffsetDeg' | 'idleAnim' | 'walkAnim' | 'runAnim'
>>) {
  const groupRef = useRef<THREE.Group>(null);

  // Hook is always called – safe
  const { scene, animations } = useGLTF(modelUrl);

  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const actions = useRef<Record<string, THREE.AnimationAction>>({});
  const lastClip = useRef<string | null>(null);

  // Initialize mixer and actions once when animations are available
  useEffect(() => {
    if (!animations?.length || mixer.current) return;
    
    mixer.current = new THREE.AnimationMixer(scene);
    actions.current = {};
    
    for (const clip of animations) {
      const action = mixer.current.clipAction(clip);
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(0);
      action.paused = false;
      actions.current[clip.name] = action;
    }

    return () => {
      mixer.current?.stopAllAction();
      mixer.current?.uncacheRoot(scene);
      mixer.current = null;
      actions.current = {};
    };
  }, [scene, animations]);

  // Decide which clip to play based on speed
  function pickClipName(): string {
    const speed = animal.currentSpeed ?? 0;
    const names = Object.keys(actions.current);
    if (names.length === 0) return ''; // Return empty string if no animations

    const has = (n: string) => !!names.find((x) => x.toLowerCase() === n.toLowerCase());
    const find = (n: string) => names.find((x) => x.toLowerCase() === n.toLowerCase());

    if (speed > 6 && has(runAnim)) {
      return find(runAnim) || names[0];
    }
    if (speed > 0.5 && has(walkAnim)) {
      return find(walkAnim) || names[0];
    }
    if (has(idleAnim)) {
      return find(idleAnim) || names[0];
    }
    return names[0];
  }

  function playExclusive(name: string) {
    if (!mixer.current || !actions.current[name]) return;
    if (lastClip.current === name) return; // Prevent unnecessary transitions

    const fadeTime = 0.3; // Slightly longer fade for smoother transitions
    const currentAction = lastClip.current ? actions.current[lastClip.current] : null;
    const nextAction = actions.current[name];

    if (currentAction && currentAction.isRunning()) {
      currentAction.fadeOut(fadeTime);
    }

    nextAction.reset()
      .setLoop(THREE.LoopRepeat, Infinity)
      .fadeIn(fadeTime)
      .play();

    lastClip.current = name;
  }

  // Only switch animation when the picked animation name changes
  const pickedClipName = pickClipName();
  useEffect(() => {
    if (Object.keys(actions.current).length === 0) return; // Wait for actions to be ready
    if (!pickedClipName) return;
    if (lastClip.current !== pickedClipName) {
      playExclusive(pickedClipName);
    }
  }, [pickedClipName]);

  // Drive transform from physics each frame
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(animal.position.x, animal.position.y + 1, animal.position.z);
    const vx = animal.velocity.x, vz = animal.velocity.z;
    if (Math.abs(vx) + Math.abs(vz) > 1e-4) {
      const ang = Math.atan2(vx, vz);
      g.rotation.y = ang + yawOffsetDeg * DEG2RAD;
    }
  });

  // Advance mixer
  useFrame((_, dt) => {
    if (mixer.current) {
      mixer.current.update(dt);
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

/* ---------------- Fallback blocky animal ---------------- */
function BlockyAnimal({
  animal,
  color = '#8B4513',
  scale = 1,
  yawOffsetDeg = 0,
}: Required<Pick<Animal3DProps, 'animal' | 'color' | 'scale' | 'yawOffsetDeg'>>) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const legs = useRef<Mesh[]>([]);

  const bodyGeometry = useMemo(() => new BoxGeometry(2, 1, 4), []);
  const headGeometry = useMemo(() => new BoxGeometry(1.5, 1.2, 2), []);
  const legGeometry  = useMemo(() => new BoxGeometry(0.3, 2, 0.3), []);

  const bodyMaterial = useMemo(() => new MeshBasicMaterial({ color }), [color]);
  const headMaterial = useMemo(() => new MeshBasicMaterial({ color }), [color]);
  const legMaterial  = useMemo(() => new MeshBasicMaterial({ color: '#654321' }), []);

  // Drive transform from physics
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(animal.position.x, animal.position.y + 1, animal.position.z);
    const vx = animal.velocity.x, vz = animal.velocity.z;
    if (Math.abs(vx) + Math.abs(vz) > 1e-4) {
      const ang = Math.atan2(vx, vz);
      g.rotation.y = ang + yawOffsetDeg * DEG2RAD;
    }
  });

  // Simple fake run anim
  useFrame((state) => {
    if (legs.current.length > 0 && animal.currentSpeed > 0) {
      const t = state.clock.getElapsedTime();
      const s = animal.currentSpeed / 10;
      legs.current.forEach((leg, i) => {
        if (!leg) return;
        const off = (i % 2) * Math.PI;
        leg.rotation.x = Math.sin(t * s * 8 + off) * 0.3;
      });
      if (bodyRef.current) {
        bodyRef.current.position.y = Math.sin(t * s * 16) * 0.1;
      }
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Body */}
      <mesh ref={bodyRef} geometry={bodyGeometry} material={bodyMaterial} position={[0, 0, 0]} />
      {/* Head */}
      <mesh geometry={headGeometry} material={headMaterial} position={[0, 0.5, -2.5]} />
      {/* Legs */}
      {[
        [-0.7, -1.5, -1],
        [ 0.7, -1.5, -1],
        [-0.7, -1.5,  1],
        [ 0.7, -1.5,  1],
      ].map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) legs.current[i] = el; }}
          geometry={legGeometry}
          material={legMaterial}
          position={p as [number, number, number]}
        />
      ))}
      {/* Antlers (minimal) */}
      <mesh geometry={legGeometry} material={legMaterial} position={[-0.3, 1.5, -2.5]} rotation={[0, 0,  0.3]} />
      <mesh geometry={legGeometry} material={legMaterial} position={[ 0.3, 1.5, -2.5]} rotation={[0, 0, -0.3]} />
    </group>
  );
}

/* ---------------- Public component ---------------- */
export function Animal3D(props: Animal3DProps) {
  const {
    animal,
    color = '#8B4513',
    modelUrl,
    scale = 1,
    yawOffsetDeg = 0,
    idleAnim = 'Idle',
    walkAnim = 'Walk',
    runAnim  = 'Gallop',
  } = props;

  return modelUrl ? (
    <GLBAnimal
      animal={animal}
      modelUrl={modelUrl}
      scale={scale}
      yawOffsetDeg={yawOffsetDeg}
      idleAnim={idleAnim}
      walkAnim={walkAnim}
      runAnim={runAnim}
    />
  ) : (
    <BlockyAnimal
      animal={animal}
      color={color}
      scale={scale}
      yawOffsetDeg={yawOffsetDeg}
    />
  );
}