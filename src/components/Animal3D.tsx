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

  // Build actions map when GLB loads
  useEffect(() => {
    if (!animations?.length) return;

    mixer.current = new THREE.AnimationMixer(scene);
    actions.current = {};
    for (const clip of animations) {
      const act = mixer.current.clipAction(clip);
      act.enabled = false;
      act.setEffectiveWeight(0);
      actions.current[clip.name] = act;
    }

    // Start with best matching clip
    playExclusive(pickClipName());

    return () => {
      mixer.current?.stopAllAction();
      mixer.current?.uncacheRoot(scene);
      mixer.current = null;
      actions.current = {};
      lastClip.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, animations]);

  function findCaseInsensitive(target: string) {
    const names = Object.keys(actions.current);
    return names.find((n) => n.toLowerCase() === target.toLowerCase());
  }

  // Decide which clip to play based on speed
  function pickClipName(): string | undefined {
    const speed = animal.currentSpeed ?? 0;
    if (speed > 6) {
      const r = findCaseInsensitive(runAnim);
      if (r) return r;
    }
    if (speed > 0.5) {
      const w = findCaseInsensitive(walkAnim);
      if (w) return w;
    }
    return findCaseInsensitive(idleAnim) ?? Object.keys(actions.current)[0];
  }

  function playExclusive(name?: string) {
    if (!name || !mixer.current) return;
    if (lastClip.current === name) return;
    lastClip.current = name;

    // Stop & disable every other action to avoid additive leftovers
    mixer.current.stopAllAction();
    for (const a of Object.values(actions.current)) {
      a.enabled = false;
      a.reset();
      a.setEffectiveWeight(0);
      a.setEffectiveTimeScale(1);
      a.paused = false;
    }

    const target = actions.current[name];
    if (!target) return;
    target.setLoop(THREE.LoopRepeat, Infinity);
    target.clampWhenFinished = false;
    target.enabled = true;
    target.reset();
    target.setEffectiveWeight(1);
    target.play();
  }

  // Update animation choice when speed changes
  useEffect(() => {
    playExclusive(pickClipName());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.currentSpeed]);

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
  useFrame((_, dt) => mixer.current?.update(dt));

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
      bodyRef.current!.position.y = Math.sin(t * s * 16) * 0.1;
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
