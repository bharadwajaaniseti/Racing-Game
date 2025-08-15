import React, { Suspense, useRef, useState } from 'react';
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

/* ---------------- GLB renderer ---------------- */
function GLBAnimal({
  animal,
  modelUrl,
  scale = 1,
  yawOffsetDeg = 0,
  idleAnim = 'Idle',
  walkAnim = 'Walk',
  runAnim = 'Gallop',
  eatAnim = 'Eat',
  isEating = false,
  forcedAnimation = '',
  onLoaded,
}: {
  animal: RaceAnimal;
  modelUrl: string;
  scale?: number;
  yawOffsetDeg?: number;
  idleAnim?: string;
  walkAnim?: string;
  runAnim?: string;
  eatAnim?: string;
  isEating?: boolean;
  forcedAnimation?: string;
  onLoaded?: (animations: string[]) => void;
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

    const animationNames = animations.map(anim => anim.name);
    onLoaded?.(animationNames);

    // Start with the first available clip so the model isn't "frozen"
    const first = animations[0]?.name;
    if (first) {
      lastClip.current = null;
      playExclusive(first);
    }

    return () => {
      mixer.current?.stopAllAction();
      mixer.current?.uncacheRoot(scene);
      mixer.current = null;
      actions.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, animations, onLoaded]);

  // Fuzzy finder for typical variations like "Armature|Idle", "Idle_InPlace", etc.
  function findLike(target: string, ...alts: string[]) {
    const names = Object.keys(actions.current);
    const needles = [target, ...alts].filter(Boolean).map(s => s.toLowerCase());
    return names.find(name => {
      const low = name.toLowerCase();
      const tail = low.replace(/.*\|/, ''); // strip "Armature|"
      return needles.some(n => low === n || tail === n || low.includes(n));
    });
  }

  // Decide which clip to play based on speed / eating / forced selection
  function pickClipName(): string {
    const speed = animal.currentSpeed ?? 0;
    const names = Object.keys(actions.current);
    if (names.length === 0) return '';

    // Forced selection
    if (forcedAnimation) {
      // First try to find exact match
      if (names.includes(forcedAnimation)) {
        return forcedAnimation;
      }
      
      // Then try fuzzy matching
      const fuzzyMatch = findLike(forcedAnimation);
      if (fuzzyMatch) {
        return fuzzyMatch;
      }
      
      // Handle common animation types
      const lowerForced = forcedAnimation.toLowerCase();
      if (lowerForced.includes('idle')) {
        return findLike(idleAnim || 'idle', 'idle_inplace') || names[0];
      }
      if (lowerForced.includes('run') || lowerForced.includes('gallop')) {
        return findLike(runAnim || 'run', 'gallop', 'run_inplace') || names[0];
      }
      if (lowerForced.includes('walk')) {
        return findLike(walkAnim || 'walk', 'walk_inplace') || names[0];
      }
      if (lowerForced.includes('eat')) {
        return findLike(eatAnim || 'eat') || names[0];
      }
      
      // If no match found, return the forced animation name anyway
      return forcedAnimation;
    }

    // Auto logic
    if (isEating) {
      const eat = findLike(eatAnim || 'eat');
      if (eat) return eat;
    }
    if (speed > 6) {
      const run = findLike(runAnim || 'run', 'gallop');
      if (run) return run;
    }
    if (speed > 0.5) {
      const walk = findLike(walkAnim || 'walk');
      if (walk) return walk;
    }
    return (
      findLike(idleAnim || 'idle', 'idle_inplace') ||
      names[0]
    );
  }

  function playExclusive(name: string) {
    if (!mixer.current || !actions.current[name]) return;
    if (lastClip.current === name) return;

    const fadeTime = 0.3;
    const currentAction = lastClip.current ? actions.current[lastClip.current] : null;
    const nextAction = actions.current[name];

    if (currentAction && currentAction.isRunning()) {
      currentAction.fadeOut(fadeTime);
    }

    nextAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fadeTime).play();
    lastClip.current = name;
  }

  // Switch animation only when target changes
  const pickedClipName = pickClipName();
  React.useEffect(() => {
    if (!pickedClipName || Object.keys(actions.current).length === 0) return;
    // Always play the animation if it's forced, or if it's different from last
    if (lastClip.current !== pickedClipName || forcedAnimation) {
      playExclusive(pickedClipName);
    }
  }, [pickedClipName, forcedAnimation, actions.current]);

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
    if (mixer.current) mixer.current.update(dt);
  });

  return (
    <group ref={groupRef} scale={scale} position={[0, 0, 0]}>
      {/* top => put the lowest point of the model at y=0 so feet sit on grid */}
      <Center top>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

/* ---------------- blocky fallback ---------------- */
function BlockyAnimal({ color = '#8B4513', scale = 1 }: { color?: string; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} scale={scale} position={[0, 0, 0]}>
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
  walkAnim?: string;
  runAnim?: string;
  eatAnim?: string;
  isEating?: boolean;
  forcedAnimation?: string;
  onAnimationsLoaded?: (animations: string[]) => void;
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
  walkAnim = 'Walk',
  runAnim = 'Gallop',
  eatAnim = 'Eat',
  isEating = false,
  forcedAnimation = '',
  onAnimationsLoaded,
}: ModelViewerProps) {
  const [cameraPosition, setCameraPosition] = useState({ zoom: 5, angle: 0, height: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundColor] = useState('#2a3a4a');
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
    <div className={`${className} relative bg-gray-900 rounded-lg overflow-hidden group`}>
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-white text-sm"
        >
          Toggle Grid
        </button>
        <button
          onClick={() => setAutoRotating(!isAutoRotating)}
          className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-white text-sm"
        >
          {isAutoRotating ? 'Stop Rotation' : 'Auto Rotate'}
        </button>
      </div>

      {/* Camera Controls */}
      <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-gray-800/80 rounded-lg p-2 space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Zoom</label>
            <input
              type="range"
              min="2"
              max="10"
              value={cameraPosition.zoom}
              onChange={(e) => setCameraPosition({ ...cameraPosition, zoom: parseFloat(e.target.value) })}
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Height</label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={cameraPosition.height}
              onChange={(e) => setCameraPosition({ ...cameraPosition, height: parseFloat(e.target.value) })}
              className="w-32"
            />
          </div>
        </div>
      </div>

      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        camera={{
          position: [
            cameraPosition.zoom * Math.cos(cameraPosition.angle),
            cameraPosition.height * 3,
            cameraPosition.zoom * Math.sin(cameraPosition.angle),
          ],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
        onPointerDown={pauseAutoRotate}
        onWheel={pauseAutoRotate}
      >
        {/* Environment and lighting */}
        <color attach="background" args={[backgroundColor]} />
        <Environment preset="sunset" background blur={0.5} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />

        <ContactShadows position={[0, 0, 0]} opacity={0.5} blur={3} far={10} resolution={1024} frames={1} />

        {/* Grid */}
        {showGrid && (
          <gridHelper args={[20, 20, '#404040', '#404040']} position={[0, 0, 0]} rotation={[0, 0, 0]} />
        )}

        <Bounds fit margin={1.2}>
          <Suspense fallback={null}>
            {modelUrl ? (
              <GLBAnimal
                animal={animal || defaultAnimal}
                modelUrl={modelUrl}
                scale={scale * 0.4}
                yawOffsetDeg={rotation}
                idleAnim={animal?.idle_anim || idleAnim}
                walkAnim={animal?.walk_anim || walkAnim}
                runAnim={animal?.run_anim || runAnim}
                eatAnim={animal?.eat_anim || eatAnim}
                isEating={isEating}
                forcedAnimation={forcedAnimation}
                onLoaded={(animations) => {
                  setReady(true);
                  onAnimationsLoaded?.(animations);
                }}
              />
            ) : (
              <BlockyAnimal color={color} scale={scale * 0.4} />
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
