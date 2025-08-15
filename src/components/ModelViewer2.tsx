import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  useGLTF,
  Center,
  Environment,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';
import type { RaceAnimal } from '../game/types';

const DEG2RAD = Math.PI / 180;

function GLBAnimal({
  animal,
  modelUrl,
  scale = 1,
  yawOffsetDeg = 0,
  forcedAnimation = '',
  onLoaded,
}: {
  animal: RaceAnimal;
  modelUrl: string;
  scale?: number;
  yawOffsetDeg?: number;
  forcedAnimation?: string;
  onLoaded?: (animations: string[]) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelUrl);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const actions = useRef<Record<string, THREE.AnimationAction>>({});
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);

  // Initialize mixer and animations
  React.useEffect(() => {
    if (!scene || !animations?.length) return;

    // Create new mixer
    mixer.current = new THREE.AnimationMixer(scene);
    actions.current = {};

    // Get simple named animations only
    const simpleAnimations = animations.filter(clip => !clip.name.includes('|'));
    
    // Set up animations
    simpleAnimations.forEach(clip => {
      const action = mixer.current!.clipAction(clip);
      action.clampWhenFinished = false;
      action.setLoop(THREE.LoopRepeat, Infinity);
      actions.current[clip.name] = action;
    });

    // Notify parent of available animations
    const availableAnims = simpleAnimations.map(a => a.name);
    console.log('Available animations:', availableAnims);
    onLoaded?.(availableAnims);

    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
        mixer.current.uncacheRoot(scene);
        mixer.current = null;
      }
      actions.current = {};
    };
  }, [scene, animations, onLoaded]);

  // Handle animation changes
  React.useEffect(() => {
    if (!mixer.current || !actions.current) return;

    const playAnimation = (name: string) => {
      if (!actions.current[name]) return;

      // Stop all current animations
      Object.values(actions.current).forEach(action => {
        action.fadeOut(0.2);
        action.stop();
      });

      // Play new animation
      const action = actions.current[name];
      action.reset();
      action.fadeIn(0.2);
      action.play();
      setCurrentAnimation(name);
      console.log('Started playing:', name);
    };

    if (forcedAnimation && actions.current[forcedAnimation]) {
      playAnimation(forcedAnimation);
    } else if (!currentAnimation && actions.current['Idle']) {
      playAnimation('Idle');
    }
  }, [forcedAnimation, currentAnimation]);

  // Update animation mixer
  useFrame((_, dt) => {
    if (mixer.current) {
      mixer.current.update(dt);
    }
  });

  return (
    <group ref={groupRef} scale={scale} position={[0, 0, 0]}>
      <Center top>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

interface ModelViewerProps {
  animal?: RaceAnimal;
  modelUrl?: string;
  scale?: number;
  rotation?: number;
  color?: string;
  className?: string;
  autoRotate?: boolean;
  forcedAnimation?: string;
  onAnimationsLoaded?: (animations: string[]) => void;
}

export function ModelViewer2({
  animal,
  modelUrl,
  scale = 1,
  rotation = 0,
  color = '#4F46E5',
  className = 'h-[400px]',
  autoRotate = true,
  forcedAnimation = '',
  onAnimationsLoaded,
}: ModelViewerProps) {
  const [cameraPosition] = useState({ zoom: 5, angle: 0, height: 1 });
  const [isAutoRotating, setAutoRotating] = React.useState(autoRotate);
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
    <div className={`${className} relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900`}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
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
        <Environment preset="sunset" background={false} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} castShadow />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={3} far={10} />

        <Suspense fallback={null}>
          {modelUrl ? (
            <GLBAnimal
              animal={animal || defaultAnimal}
              modelUrl={modelUrl}
              scale={scale}
              yawOffsetDeg={rotation}
              forcedAnimation={forcedAnimation}
              onLoaded={onAnimationsLoaded}
            />
          ) : null}
        </Suspense>

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
