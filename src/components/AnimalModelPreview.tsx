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
  const bad = /(hit|react|death|attack|turn|jump)/i;
  const strip = (s: string) => s.replace(/^.*\|/, '');

  // if a safe requested clip exists, honor it
  if (requested && !bad.test(strip(requested))) {
    const exact = anims.find(a => strip(a.name) === strip(requested));
    if (exact) return exact;
  }

  // prefer exact Idle, then other idle-ish, then gait, else first
  const find = (re: RegExp) => anims.find(a => re.test(strip(a.name)) && !bad.test(strip(a.name)));

  return (
    find(/^Idle(_\d+)?$/i) ||
    find(/(Idle|Breath|Stand)/i) ||
    find(/(Walk|Run|Gallop)/i) ||
    anims[0]
  );
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
  const [isReady, setIsReady] = React.useState(false);
  const sceneRef = React.useRef(scene);

  const [hasWebGLContext, setHasWebGLContext] = React.useState(true);
  const playAnimation = React.useCallback((name: string) => {
    try {
      if (!mixer.current || !actions.current?.[name]) {
        return;
      }

      if (!hasWebGLContext) {
        return;
      }

      const action = actions.current[name];
      if (!action || !action.getClip) {
        return;
      }

      const clipName = action.getClip().name;

      // If it's the same animation already playing, don't interrupt it
      if (currentAction.current?.getClip()?.name === name) {
        return;
      }

      // Safely stop current action
      if (currentAction.current) {
        try {
          const current = currentAction.current;
          if (current.enabled) {
            current.fadeOut(0.2);
            setTimeout(() => {
              try {
                if (current.enabled) {
                  current.stop();
                  current.enabled = false;
                }
              } catch (e) {
                console.debug('Animation cleanup error (expected):', e);
              }
            }, 200);
          }
        } catch (e) {
          console.debug('Current animation cleanup error (expected):', e);
        }
      }

      // Configure new action
      action.enabled = true;
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(1);
      
      if (isNonLoopClip(clipName)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }

      // Play new action with fade in
      action.reset();
      action.fadeIn(0.2);
      action.play();
      
      currentAction.current = action;
    } catch (e) {
      console.debug('Animation playback error (expected):', e);
      // Reset state on serious errors
      currentAction.current = null;
      setHasWebGLContext(false);
    }
  }, [hasWebGLContext]);

  // Initialize mixer once when scene is loaded
  React.useEffect(() => {
    if (!scene) return;
    
    sceneRef.current = scene;
    mixer.current = new THREE.AnimationMixer(scene);
    
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
        mixer.current.uncacheRoot(scene);
        mixer.current = null;
      }
    };
  }, [scene]);

  // Set up animations when they're available
  const animSetupKey = React.useRef<string>('');
  React.useEffect(() => {
    // Reset WebGL context state
    setHasWebGLContext(true);

    if (!mixer.current || !hasWebGLContext) {
      onAnimationsLoaded?.([]);
      onLoaded?.();
      setIsReady(true);
      return;
    }

    try {
      // Create a setup key based on the current animations
      const setupKey = animations?.map(a => a.name).sort().join(',') || '';
      if (setupKey === animSetupKey.current) return;
      animSetupKey.current = setupKey;

      if (!animations?.length) {
        onAnimationsLoaded?.([]);
        onLoaded?.();
        setIsReady(true);
        return;
      }

      // Create actions for all clips
      actions.current = {};
      for (const clip of animations) {
        try {
          const action = mixer.current.clipAction(clip);
          action.enabled = false;
          action.setEffectiveWeight(0);
          actions.current[clip.name] = action;
        } catch (e) {
          console.debug(`Failed to create action for ${clip.name}:`, e);
        }
      }

      // Only notify if we successfully created some actions
      if (Object.keys(actions.current).length > 0) {
        onAnimationsLoaded?.(animations);
        onLoaded?.();
        setIsReady(true);
      }

      return () => {
        try {
          // Stop all actions when cleaning up
          if (mixer.current) {
            mixer.current.stopAllAction();
            Object.values(actions.current).forEach(action => {
              if (action.enabled) {
                action.stop();
                action.enabled = false;
              }
            });
          }
        } catch (e) {
          console.debug('Cleanup error (expected):', e);
        }
        actions.current = {};
      };
    } catch (e) {
      console.debug('Animation setup error (expected):', e);
      setHasWebGLContext(false);
      actions.current = {};
    }
  }, [animations, mixer.current, onAnimationsLoaded, onLoaded, hasWebGLContext]);

  // Track last played animation name
  const lastClipName = React.useRef<string | null>(null);

  // Switch animation when animName changes
  React.useEffect(() => {
    if (!mixer.current || !animations?.length || !isReady) return;
    if (!animName) return;
    
    // Don't switch if it's the same animation
    if (lastClipName.current === animName) return;
    
    // Record and play the new animation
    lastClipName.current = animName;
    playAnimation(animName);
  }, [animName, animations, isReady, playAnimation]);

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
  const [currentAnimation, setCurrentAnimation] = React.useState<string>('');
  const [hasWebGLContext, setHasWebGLContext] = React.useState(true);
  const lastAnimation = React.useRef<string>('');
  const idleTimer = React.useRef<number | null>(null);

  // Handle WebGL context events
  React.useEffect(() => {
    const handleContextLost = () => {
      console.debug('WebGL context lost');
      setHasWebGLContext(false);
    };

    const handleContextRestored = () => {
      console.debug('WebGL context restored');
      setHasWebGLContext(true);
    };

    window.addEventListener('webglcontextlost', handleContextLost);
    window.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      window.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  const sentForUrlRef = React.useRef<string | null>(null);

  const animationsKey = React.useRef('');
  const handleAnimationsLoaded = React.useCallback(
    (anims: THREE.AnimationClip[]) => {
      if (!onAnimationSelect || anims.length === 0) return;
      
      // Check if these are the same animations we've already processed
      const key = anims.map(a => a.name).sort().join(',');
      if (animationsKey.current === key) return;
      animationsKey.current = key;
      
      // Filter out duplicate animations (keeping non-prefixed versions)
      const uniqueAnims = anims.reduce((acc: THREE.AnimationClip[], anim) => {
        const normalizedName = anim.name.replace(/^.*\|/, '');
        const existing = acc.find(a => a.name.replace(/^.*\|/, '') === normalizedName);
        if (!existing || !anim.name.includes('AnimalArmature|')) {
          if (existing) {
            acc.splice(acc.indexOf(existing), 1);
          }
          acc.push(anim);
        }
        return acc;
      }, []);

      // Update state with unique animations
      setAvailableAnimations(uniqueAnims);
      
      // Only update animation selection if we haven't done so for this model
      if (sentForUrlRef.current !== modelUrl) {
        sentForUrlRef.current = modelUrl!;
        const neutral = uniqueAnims.find(a => /^Idle(_\d+)?$/i.test(a.name.replace(/^.*\|/, ''))) ||
                       uniqueAnims.find(a => /(Idle|Breath|Stand)/i.test(a.name.replace(/^.*\|/, ''))) ||
                       uniqueAnims[0];
        
        if (neutral) {
          setCurrentAnimation(neutral.name);
          lastAnimation.current = neutral.name;
          onAnimationSelect(neutral.name, uniqueAnims);
        }
      }
    },
    [onAnimationSelect, modelUrl]
  );

  // Only update currentAnimation if animName prop changes and is different
  React.useEffect(() => {
    if (animName && animName !== currentAnimation) {
      setCurrentAnimation(animName);
      lastAnimation.current = animName;
    }
  }, [animName, currentAnimation]);

  const pauseAutoRotate = React.useCallback(() => {
    setAutoRotate(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setAutoRotate(true), 1500);
  }, []);

  const handleAnimationChange = (newAnimName: string) => {
    if (newAnimName === currentAnimation) return; // Prevent redundant updates
    setCurrentAnimation(newAnimName);
    lastAnimation.current = newAnimName;
    if (onAnimationSelect) {
      onAnimationSelect(newAnimName, availableAnimations);
    }
  };

  if (!modelUrl)
    return (
      <div className="h-64 flex items-center justify-center text-sm opacity-70">
        No model uploaded
      </div>
    );

  return (
    <div className="space-y-4">
      {/* 3D Viewer */}
      <div className="h-[400px] relative bg-gray-900 rounded-lg overflow-hidden">
        <Canvas
          frameloop={hasWebGLContext ? "always" : "never"}
          dpr={[1, 1.5]}
          gl={{ 
            antialias: true, 
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: true,
            preserveDrawingBuffer: true
          }}
          camera={{ position: [3, 4.5, 3], fov: 50, near: 0.1, far: 1000 }}
          shadows
          onPointerDown={pauseAutoRotate}
          onWheel={pauseAutoRotate}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', () => {
              console.debug('WebGL context lost');
              setHasWebGLContext(false);
            });
            gl.domElement.addEventListener('webglcontextrestored', () => {
              console.debug('WebGL context restored');
              setHasWebGLContext(true);
            });
          }}
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
                animName={currentAnimation}
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
            <div>Current: {currentAnimation || 'None'}</div>
            <div>Available: {availableAnimations.length}</div>
          </div>
        )}
      </div>

      {/* Animation Controls - Only button grid, no dropdowns */}
      {availableAnimations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">Animations</h4>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {availableAnimations.map((anim) => (
              <button
                key={anim.name}
                onClick={() => handleAnimationChange(anim.name)}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  currentAnimation === anim.name
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {anim.name}
              </button>
            ))}
          </div>
          {/* Animation info */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              <div>Playing: <span className="text-cyan-400">{currentAnimation}</span></div>
              <div>Duration: <span className="text-cyan-400">
                {availableAnimations.find(a => a.name === currentAnimation)?.duration.toFixed(2) || 0}s
              </span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}