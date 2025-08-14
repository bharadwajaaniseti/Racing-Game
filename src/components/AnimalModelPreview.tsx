import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, scale=1, rotation=0, animName }: { url: string; scale?: number; rotation?: number; animName?: string; }) {
  const { scene, animations } = useGLTF(url);
  const mixer = React.useRef<THREE.AnimationMixer>();
  
  React.useEffect(() => {
    // Center and size the model appropriately
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetScale = (1.8 / maxDim) * scale; // Slightly larger scale
    scene.scale.setScalar(targetScale);
    
    // Reset position first
    scene.position.set(0, 0, 0);
    // Center the model and adjust height to be in middle of view
    scene.position.x = -center.x * targetScale;
    scene.position.z = -center.z * targetScale;
    scene.position.y = -center.y * targetScale + (size.y * targetScale * 0.8); // Lift model up higher
    
    if (animations?.length) {
      mixer.current = new THREE.AnimationMixer(scene);
      const clip = THREE.AnimationClip.findByName(animations, animName || 'Idle') || animations[0];
      mixer.current.clipAction(clip).play();
    }
    return () => mixer.current?.stopAllAction();
  }, [animations, animName, scene, scale]);
  
  useFrame((_, d) => mixer.current?.update(d));
  return <primitive object={scene} rotation={[0, rotation * Math.PI/180, 0]} />;
}

export default function AnimalModelPreview({ modelUrl, scale=1, rotation=0, animName }: { modelUrl?: string; scale?: number; rotation?: number; animName?: string; }) {
  if (!modelUrl) return <div className="h-64 flex items-center justify-center text-sm opacity-70">No model uploaded</div>;
  return (
    <Canvas camera={{ position: [0, 2, 4], fov: 35 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3,4,2]} intensity={1.2} />
      <Model url={modelUrl} scale={scale} rotation={rotation} animName={animName} />
      <OrbitControls 
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        target={[0, 1.5, 0]}  // Look at an even higher point
      />
    </Canvas>
  );
}
