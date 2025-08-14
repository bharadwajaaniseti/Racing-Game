import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  useGLTF,
  Center,
  Bounds,
  useBounds,
  Environment,
  ContactShadows,
} from '@react-three/drei';

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

/* ---------------- model ---------------- */
type ModelProps = {
  url: string;
  scale?: number;
  rotation?: number;
  onLoaded?: () => void;
};

function Model({
  url,
  scale = 1,
  rotation = 0,
  onLoaded,
}: ModelProps) {
  const { scene } = useGLTF(url);
  
  React.useEffect(() => {
    onLoaded?.();
  }, [scene, onLoaded]);

  return (
    <group
      position={[0, -0.5, 0]}
      scale={scale}
      rotation={[0, rotation * DEG2RAD, 0]}
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
  rotation?: number;
};

export default function AnimalModelPreview({
  modelUrl,
  scale = 1,
  rotation = 0,
}: PreviewProps) {
  const [autoRotate, setAutoRotate] = React.useState(true);
  const [ready, setReady] = React.useState(false);
  const idleTimer = React.useRef<number | null>(null);

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
    <div className="space-y-4">
      <div className="h-[400px] relative bg-gray-900 rounded-lg overflow-hidden">
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
              <Model
                url={modelUrl}
                scale={scale * 0.4}
                rotation={rotation}
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
            autoRotateSpeed={1.6}
            enableDamping
            dampingFactor={0.06}
            minDistance={1.2}
            maxDistance={18}
          />
        </Canvas>
      </div>
    </div>
  );
}
