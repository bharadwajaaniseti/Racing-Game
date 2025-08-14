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
  if (requested && !isNonLoopClip(requested)) {
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
  const mixer = React.useRef<THREE.AnimationMixer>();
  const actions = React.useRef<Record<string, THREE.AnimationAction>>({});
  const lastClipName = React.useRef<string | null>(null);

  // Build actions map once per GLB
  React.useEffect(() => {
    onAnimationsLoaded?.(animations || []);
    if (!animations?.length) {
      onLoaded?.();
      return;
    }

    mixer.current = new THREE.AnimationMixer(scene);
    actions.current = {};
    for (const clip of animations) {
      const act = mixer.current.clipAction(clip);
      act.enabled = false;
      act.setEffectiveWeight(0);
      actions.current[clip.name] = act;
    }

    // Start with a neutral clip (exclusive)
    const initial = pickNeutralClip(animations, animName) ?? animations[0];
    playExclusive(initial.name);

    onLoaded?.();

    // cleanup
    return () => {
      mixer.current?.stopAllAction();
      mixer.current?.uncacheRoot(scene);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animations, scene]);

  // Switch clip exclusively when animName changes
  React.useEffect(() => {
    if (!mixer.current || !animations?.length) return;
    const clip = pickNeutralClip(animations, animName);
    if (!clip) return;
    playExclusive(clip.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animName, animations]);

  // Exclusive playback: stop everything else, play only target
  function playExclusive(name: string) {
    const m = mixer.current;
    if (!m) return;
    if (lastClipName.current === name) return; // already playing

    lastClipName.current = name;

    // Hard stop all actions to avoid additive leftovers
    m.stopAllAction();
    for (const a of Object.values(actions.current)) {
      a.enabled = false;
      a.reset();
      a.setEffectiveWeight(0);
      a.setEffectiveTimeScale(1);
      a.paused = false;
    }

    const target = actions.current[name];
    if (!target) return;

    const clipName = target.getClip().name;
    if (isNonLoopClip(clipName)) {
      target.setLoop(THREE.LoopOnce, 0);
      target.clampWhenFinished = true;
    } else {
      target.setLoop(THREE.LoopRepeat, Infinity);
      target.clampWhenFinished = false;
    }

    target.enabled = true;
    target.reset();
    target.setEffectiveWeight(1);
    target.setEffectiveTimeScale(1);
    target.play();
  }

  useFrame((_, dt) => mixer.current?.update(dt));

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
  rotation?: number; // UI “Model Rotation (Y°)”
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
  const idleTimer = React.useRef<number | null>(null);

  const handleAnimationsLoaded = React.useCallback(
    (anims: THREE.AnimationClip[]) => {
      if (!onAnimationSelect || anims.length === 0) return;
      const neutral = pickNeutralClip(anims, animName)?.name ?? anims[0].name;
      onAnimationSelect(neutral, anims);
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
    </div>
  );
}