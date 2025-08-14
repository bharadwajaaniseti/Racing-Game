import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  useGLTF,
  Center,
  Bounds,
  useBounds,
  Environment,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';
import type { RaceAnimal } from '../game/types';

const DEG2RAD = Math.PI / 180;

/* ---- components that must live INSIDE <Bounds> ---- */
function FitOnReadyOnce({ ready }: { ready: boolean }) {
  const api = useBounds();
  const did = React.useRef(false);
  React.useEffect(() => {
    if (ready && !did.current) {
      did.current = true;
      api.refresh().fit();
    }
  }, [ready, api]);
  return null;
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
  onLoaded,
}: {
  animal: RaceAnimal;
  modelUrl: string;
  scale?: number;
  yawOffsetDeg?: number;
  idleAnim?: string;
  walkAnim?: string;
  runAnim?: string;
  onLoaded?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelUrl);
  
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const actions = useRef<Record<string, THREE.AnimationAction>>({});
  const lastClip = useRef<string | null>(null);

  React.useEffect(() => {
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

    onLoaded?.();

    return () => {
      mixer.current?.stopAllAction();
      mixer.current?.uncacheRoot(scene);
      mixer.current = null;
      actions.current = {};
    };
  }, [scene, animations, onLoaded]);

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
  React.useEffect(() => {
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
    g.position.set(animal.position.x, animal.position.y, animal.position.z);
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
    <group ref={groupRef} scale={scale} position={[0, -0.5, 0]}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

/* ---------------- blocky fallback ---------------- */
function BlockyAnimal({ animal, color = '#8B4513', scale = 1, yawOffsetDeg = 0 }: any) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} scale={scale} position={[0, -0.5, 0]}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/* ---------------- main component ---------------- */
interface ModelViewerProps {
  animal?: RaceAnimal;
  modelUrl?: string;
  scale?: number;
  rotation?: number;
  color?: string;
  className?: string;
  autoRotate?: boolean;
  idleAnim?: string;
  runAnim?: string;
}

export function ModelViewer({
  animal,
  modelUrl,
  scale = 1,
  rotation = 0,
  color = '#4F46E5',
  className = 'h-[400px]',
  autoRotate = true,
  idleAnim = 'Idle',
  runAnim = 'Gallop',
}: ModelViewerProps) {
  const [isAutoRotating, setAutoRotating] = React.useState(autoRotate);
  const [ready, setReady] = React.useState(false);
  const idleTimer = React.useRef<number | null>(null);

  const pauseAutoRotate = React.useCallback(() => {
    setAutoRotating(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setAutoRotating(autoRotate), 1500);
  }, [autoRotate]);

  if (!modelUrl && !animal) {
    return (
      <div className={`${className} flex items-center justify-center text-sm opacity-70`}>
        No model available
      </div>
    );
  }

  const defaultAnimal: RaceAnimal = {
    id: 'preview',
    user_id: 'preview',
    name: 'Preview',
    type: 'preview',
    speed: 0,
    acceleration: 0,
    stamina: 0,
    temper: 0,
    experience: 0,
    level: 1,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    currentSpeed: 0,
    currentStamina: 0,
    lap: 0,
    distance: 0,
    finished: false,
  };

  return (
    <div className={`${className} relative bg-gray-900 rounded-lg overflow-hidden`}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ 
          antialias: true, 
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        }}
        camera={{ position: [3, 4.5, 3], fov: 50, near: 0.1, far: 1000 }}
        shadows
        onPointerDown={pauseAutoRotate}
        onWheel={pauseAutoRotate}
      >
        {/* Environment and lighting */}
        <color attach="background" args={['#2a3a4a']} />
        <Environment preset="sunset" background blur={0.5} />
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[-5, 5, -5]}
          intensity={0.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.5}
          blur={3}
          far={10}
          resolution={1024}
          frames={1}
        />

        <Bounds fit margin={1.2}>
          <Suspense fallback={null}>
            {modelUrl ? (
              <GLBAnimal
                animal={animal || defaultAnimal}
                modelUrl={modelUrl}
                scale={scale * 0.4}
                yawOffsetDeg={rotation}
                idleAnim={idleAnim}
                runAnim={runAnim}
                onLoaded={() => setReady(true)}
              />
            ) : (
              <BlockyAnimal
                animal={animal || defaultAnimal}
                color={color}
                scale={scale * 0.4}
                yawOffsetDeg={rotation}
              />
            )}
          </Suspense>
          <FitOnReadyOnce ready={ready} />
        </Bounds>

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          autoRotate={isAutoRotating}
          autoRotateSpeed={1.6}
          enableDamping
          dampingFactor={0.06}
          minDistance={1.2}
          maxDistance={18}
        />
      </Canvas>
    </div>
  );
}
