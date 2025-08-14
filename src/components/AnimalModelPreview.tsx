import React, { Suspense } from 'react';
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

const DEG2RAD = Math.PI / 180;

// Facing comes from your UI "Model Rotation (Y°)"
const YAW_FIX_DEG = 0;
const PITCH_FIX_DEG = 0;
const ROLL_FIX_DEG = 0;

/* ---------------- helpers ---------------- */
function isNonLoopClip(name: string) {
  return /hit|react|death|attack|turn|jump/i.test(name);
}
function pickNeutralClip(anims: THREE.AnimationClip[], requested?: string) {
  if (!anims?.length) return undefined;
  if (requested) {
    const exact = anims.find((a) => a.name === requested);
    if (exact) return exact;
  }
  const by = (r: RegExp) => anims.find((a) => r.test(a.name));
  return by(/idle|breath|stand/i) || by(/walk|run|gallop/i) || anims[0];
}

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

/* ---------------- model ---------------- */
type ModelProps = {
  url: string;
  scale?: number;
  rotation?: number; // UI yaw (deg)
  animName?: string;
  onAnimationsLoaded?: (anims: THREE.AnimationClip[]) => void;
  onLoaded?: () => void; // notify when GLB is ready (to trigger Fit)
};

function Model({
  url,
  scale = 1,
  rotation = 0,
  animName,
  onAnimationsLoaded,
  onLoaded,
}: ModelProps) {
  const { scene, animations } = useGLTF(url);
  const mixer = React.useRef<THREE.AnimationMixer | null>(null);
  const actions = React.useRef<Record<string, THREE.AnimationAction>>({});
  const currentAction = React.useRef<THREE.AnimationAction | null>(null);

  // Build actions map once per GLB
  React.useEffect(() => {
    console.log('Model loaded with animations:', animations?.map(a => a.name));
    onAnimationsLoaded?.(animations || []);
    
    if (!animations?.length) {
      onLoaded?.();
      return;
    }

    // Clean up previous mixer
    if (mixer.current) {
      mixer.current.stopAllAction();
      mixer.current.uncacheRoot(mixer.current.getRoot());
    }

    mixer.current = new THREE.AnimationMixer(scene);
    actions.current = {};
    
    for (const clip of animations) {
      const action = mixer.current.clipAction(clip);
      actions.current[clip.name] = action;
    }

    // Start with initial animation
    const initialClip = pickNeutralClip(animations, animName);
    if (initialClip) {
      playAnimation(initialClip.name);
    }

    onLoaded?.();

    // cleanup
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
        mixer.current.uncacheRoot(scene);
        mixer.current = null;
      }
      actions.current = {};
      currentAction.current = null;
    };
  }, [animations, scene, onAnimationsLoaded, onLoaded]);

  // Switch animation when animName changes
  React.useEffect(() => {
    if (!mixer.current || !animations?.length || !animName) return;
    
    console.log('Switching to animation:', animName);
    playAnimation(animName);
  }, [animName, animations]);

  function playAnimation(name: string) {
    if (!mixer.current || !actions.current[name]) {
      console.log('Cannot play animation:', name, 'Available:', Object.keys(actions.current));
      return;
    }

    console.log('Playing animation:', name);

    // Stop current action
    if (currentAction.current) {
      currentAction.current.fadeOut(0.2);
    }

    // Start new action
    const action = actions.current[name];
    const clipName = action.getClip().name;
    
    if (isNonLoopClip(clipName)) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }

    action.reset();
    action.fadeIn(0.2);
    action.play();
    
    currentAction.current = action;
  }

  useFrame((_, dt) => {
    if (mixer.current) {
      mixer.current.update(dt);
    }
  });

  return (
    // Rotate a wrapper (not the GLB) so bones stay happy
    <group
      position={[0, -0.5, 0]}
      scale={scale}
      rotation={[
        PITCH_FIX_DEG * DEG2RAD,
        (YAW_FIX_DEG + rotation) * DEG2RAD,
        ROLL_FIX_DEG * DEG2RAD,
      ]}
    >
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

/* ---------------- preview ---------------- */
type PreviewProps = {
  modelUrl?: string;
  scale?: number;
  rotation?: number; // UI "Model Rotation (Y°)"
  animName?: string;
  onAnimationSelect?: (name: string, anims: THREE.AnimationClip[]) => void;
};

export default function AnimalModelPreview({
  modelUrl,
  scale = 1,
  rotation = 0,
  animName,
  onAnimationSelect,
}: PreviewProps) {
  const [autoRotate, setAutoRotate] = React.useState(true);
  const [ready, setReady] = React.useState(false);
  const [availableAnimations, setAvailableAnimations] = React.useState<THREE.AnimationClip[]>([]);
  const idleTimer = React.useRef<number | null>(null);

  const handleAnimationsLoaded = React.useCallback(
    (anims: THREE.AnimationClip[]) => {
      console.log('Animations loaded:', anims.map(a => a.name));
      setAvailableAnimations(anims);
      if (onAnimationSelect && anims.length > 0) {
        const neutral = pickNeutralClip(anims, animName)?.name ?? anims[0].name;
        onAnimationSelect(neutral, anims);
      }
    },
    [onAnimationSelect, animName]
  );

  const pauseAutoRotate = React.useCallback(() => {
    setAutoRotate(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setAutoRotate(true), 1500);
  }, []);

  if (!modelUrl)
    return (
      <div className="h-64 flex items-center justify-center text-sm opacity-70">
        No model uploaded
      </div>
    );

  return (
    <div className="h-[600px] relative bg-gray-900 rounded-lg overflow-hidden">
      <Canvas
        frameloop="always"
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [3, 4.5, 3], fov: 50, near: 0.1, far: 1000 }}
        shadows
        onPointerDown={pauseAutoRotate}
        onWheel={pauseAutoRotate}
      >
        {/* Studio lighting + soft ground shadow */}
        <Environment preset="studio" />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 6, 3]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.35}
          blur={2.8}
          far={10}
          resolution={1024}
          frames={1}
        />

        {/* Fit once; not observing animations → smooth orbit */}
        <Bounds fit margin={1.2}>
          <Suspense fallback={null}>
            <Model
              key={modelUrl} // Force remount when model changes
              url={modelUrl}
              scale={scale * 0.4}
              rotation={rotation}
              animName={animName}
              onAnimationsLoaded={handleAnimationsLoaded}
              onLoaded={() => setReady(true)}
            />
          </Suspense>
          <FitOnReadyOnce ready={ready} />
        </Bounds>

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          enableDamping
          dampingFactor={0.06}
          minDistance={1.2}
          maxDistance={18}
        />
      </Canvas>

      {/* Debug info */}
      {availableAnimations.length > 0 && (
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded">
          <div>Current: {animName || 'None'}</div>
          <div>Available: {availableAnimations.length}</div>
        </div>
      )}
    </div>
  );
}