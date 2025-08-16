// FILE: src/components/ProceduralTrack.tsx
import React, { useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { GroupProps } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows, OrbitControls, useGLTF, useAnimations } from "@react-three/drei";

export type TrackTheme = "street" | "forest";

// External animal model config you can pass from Race.tsx
export type AnimalSpec = {
  name: string;
  color?: string;
  url?: string;
  clip?: string;
  scale?: number;
  yaw?: number;
  speed?: number;
  fitHeight?: number; // normalized height in world units
};

const ANIMAL_NAMES = [
  "Deer",
  "Lightning Bolt",
  "Thunder Hooves",
  "Swift Wind",
  "Storm Chaser",
  "Night Runner",
  "River Dasher",
  "Shadow Mane",
  "Blaze Tail",
  "Frost Step",
];

export interface TrackOptions {
  seed: string;
  theme: TrackTheme;
  segmentCount: number;      // logical points used to build the path
  segmentLength: number;     // average spacing between points (world units)
  trackWidth: number;        // width of drivable surface
  curveChance: number;       // 0..1 probability a point will curve
  maxCurveAngleDeg: number;  // maximum delta heading per step (5..25)
  obstacleDensity: number;   // 0..1 probability an obstacle is spawned per path step
}

// ---------------- Seeded RNG (mulberry32) ----------------
function hashSeed(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------- Simple terrain noise (fractal) ----------------
function fbm(x: number, z: number, rand: () => number) {
  const s = 0.0075; // frequency
  let amp = 1.0;
  let freq = s;
  let sum = 0;
  for (let o = 0; o < 5; o++) {
    sum += amp * (Math.sin(x * freq + o * 12.3) * Math.cos(z * freq + o * 4.7));
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum;
}

// Height function factory (deterministic from seed)
function makeHeightFn(seed: string) {
  const r = mulberry32(hashSeed(seed) ^ 0x9e3779b9);
  const base = (x: number, z: number) => fbm(x, z, r);
  const lakeX = 0, lakeZ = 40;
  const lakeRadius = 26;
  const lakeDepth = 2.2;
  return (x: number, z: number) => {
    const hills = base(x, z) * 3.4 + base(x * 0.4, z * 0.4) * 2.0;
    const gentle = hills * 0.35;
    const dx = x - lakeX, dz = z - lakeZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const hole = dist < lakeRadius ? -lakeDepth * (1 - dist / lakeRadius) : 0;
    return gentle + hole;
  };
}

// ---------------- Path generation ----------------
function generateCenterline(opts: TrackOptions, heightAt: (x: number, z: number) => number) {
  const rand = mulberry32(hashSeed(opts.seed));
  const pts: THREE.Vector3[] = [];
  let heading = 0; // radians, 0 = +Z
  let cursor = new THREE.Vector3(0, 0, 0);
  cursor.y = heightAt(cursor.x, cursor.z) + 0.12;
  pts.push(cursor.clone());
  for (let i = 1; i < opts.segmentCount; i++) {
    const step = opts.segmentLength * (0.9 + rand() * 0.2);
    const dir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    cursor = cursor.clone().add(dir.multiplyScalar(step));
    if (rand() < opts.curveChance) {
      const delta = THREE.MathUtils.degToRad(5 + rand() * (opts.maxCurveAngleDeg - 5));
      heading += rand() < 0.5 ? delta : -delta;
    }
    const y = heightAt(cursor.x, cursor.z);
    const prevY = pts[pts.length - 1].y;
    cursor.y = THREE.MathUtils.lerp(prevY, y, 0.6) + 0.1;
    pts.push(cursor.clone());
  }
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.15);
}

// ---------------- Ribbon & edge geometry ----------------
function buildRibbonGeometry(curve: THREE.CatmullRomCurve3, width: number, samples = 500) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t).normalize();
    const n = new THREE.Vector3().crossVectors(up, tan).normalize();
    const left = p.clone().add(n.clone().multiplyScalar(-width / 2));
    const right = p.clone().add(n.clone().multiplyScalar(width / 2));
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t * 10, 1, t * 10);
    if (i > 0) {
      const a = (i - 1) * 2; const b = a + 1; const c = a + 2; const d = a + 3;
      indices.push(a, b, d, a, d, c);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function buildEdgeStrip(curve: THREE.CatmullRomCurve3, widthFromCenter: number, stripWidth = 0.08, samples = 500) {
  const positions: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t).normalize();
    const side = new THREE.Vector3().crossVectors(up, tan).normalize();
    const c = p.clone().add(side.multiplyScalar(widthFromCenter));
    const forward = tan.clone().setY(0).normalize();
    const inner = c.clone().add(forward.clone().multiplyScalar(-stripWidth / 2));
    const outer = c.clone().add(forward.clone().multiplyScalar(stripWidth / 2));
    positions.push(inner.x, inner.y + 0.004, inner.z, outer.x, outer.y + 0.004, outer.z);
    if (i > 0) {
      const a = (i - 1) * 2; const b = a + 1; const c2 = a + 2; const d = a + 3;
      indices.push(a, b, d, a, d, c2);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// Utility: get point on track with lateral offset (for props/trees)
function placeOnTrack(curve: THREE.CatmullRomCurve3, width: number, t: number, lateral: number) {
  const p = curve.getPoint(t);
  const tan = curve.getTangent(t).normalize();
  const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  return p.clone().add(n.multiplyScalar(THREE.MathUtils.clamp(lateral, -width / 2, width / 2)));
}

// ---- NEW: even lane spacing across track (no overlap) ----
function computeLanes(count: number, width: number, sideMargin = 0.9) {
  if (count <= 1) return [0];
  const usable = Math.max(0, width - sideMargin * 2);
  const step = usable / (count - 1);
  const left = -usable / 2;
  return Array.from({ length: count }, (_, i) => left + i * step);
}

/** ---------------- Terrain + Track Component ---------------- */
export function ProceduralTrack({ options, ...groupProps }: GroupProps & { options: TrackOptions }) {
  const heightAt = useMemo(() => makeHeightFn(options.seed), [options.seed]);
  const curve = useMemo(() => generateCenterline(options, heightAt), [options, heightAt]);
  const ribbon = useMemo(() => buildRibbonGeometry(curve, options.trackWidth, Math.max(300, options.segmentCount * 8)), [curve, options.trackWidth, options.segmentCount]);
  const leftStrip = useMemo(() => buildEdgeStrip(curve, -options.trackWidth / 2, 0.12), [curve, options.trackWidth]);
  const rightStrip = useMemo(() => buildEdgeStrip(curve, options.trackWidth / 2, 0.12), [curve, options.trackWidth]);

  const coneRef = useRef<THREE.InstancedMesh>(null);
  const bollardRef = useRef<THREE.InstancedMesh>(null);
  const barrierRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const logRef = useRef<THREE.InstancedMesh>(null);
  const stumpRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);

  const counts = useMemo(() => {
    const rand = mulberry32(hashSeed(options.seed) ^ 0x517cc1b7);
    const steps = Math.max(30, options.segmentCount);
    const density = THREE.MathUtils.clamp(options.obstacleDensity, 0, 1);
    let c1 = 0, c2 = 0, c3 = 0, r = 0, l = 0, s = 0, trees = 280;
    const place = (fn: () => void) => { for (let i = 0; i < steps; i++) if (rand() < density) fn(); };
    if (options.theme === "street") { place(() => c1++); place(() => c2++); place(() => c3++); }
    else { place(() => r++); place(() => l++); place(() => s++); }
    return { cone: c1 || 1, bollard: c2 || 1, barrier: c3 || 1, rock: r || 1, log: l || 1, stump: s || 1, trees };
  }, [options]);

  useLayoutEffect(() => {
    const rand = mulberry32(hashSeed(options.seed) ^ 0x1234567);
    const mat = new THREE.Matrix4();
    const scatterOnTrack = (ref: React.RefObject<THREE.InstancedMesh>, count: number, lateralPad = 0.4, yOffset = 0) => {
      const mesh = ref.current; if (!mesh) return;
      for (let i = 0; i < count; i++) {
        const t = rand();
        const lateral = (rand() * (options.trackWidth - lateralPad * 2)) - (options.trackWidth - lateralPad * 2) / 2;
        const pos = placeOnTrack(curve, options.trackWidth, t, lateral);
        mat.makeTranslation(pos.x, pos.y + yOffset, pos.z);
        mesh.setMatrixAt(i, mat);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    const scatterForest = (ref: React.RefObject<THREE.InstancedMesh>, count: number, ringMin = options.trackWidth * 1.6, ringMax = options.trackWidth * 5.2) => {
      const mesh = ref.current; if (!mesh) return;
      for (let i = 0; i < count; i++) {
        const t = rand();
        const lateral = THREE.MathUtils.lerp(ringMin, ringMax, rand()) * (rand() < 0.5 ? -1 : 1);
        const pos = placeOnTrack(curve, options.trackWidth, t, lateral);
        const y = heightAt(pos.x, pos.z);
        mat.makeTranslation(pos.x, y, pos.z);
        mesh.setMatrixAt(i, mat);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    if (options.theme === "street") {
      scatterOnTrack(coneRef, counts.cone, 0.5, 0.2);
      scatterOnTrack(bollardRef, counts.bollard, 0.5, 0.4);
      scatterOnTrack(barrierRef, counts.barrier, 0.6, 0.15);
    } else {
      scatterOnTrack(rockRef, counts.rock);
      scatterOnTrack(logRef, counts.log);
      scatterOnTrack(stumpRef, counts.stump);
      scatterForest(treeRef, counts.trees);
    }
  }, [options, curve, counts, heightAt]);

  const terrain = useMemo(() => {
    const size = 260; const res = 240;
    const geom = new THREE.PlaneGeometry(size, size, res, res);
    geom.rotateX(-Math.PI / 2);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const z = pos.getZ(i);
      const y = heightAt(x, z); pos.setY(i, y);
    }
    pos.needsUpdate = true; geom.computeVertexNormals(); return geom;
  }, [heightAt]);

  const asphalt = new THREE.Color("#2a2a2a");
  const dirt = new THREE.Color("#6b5634");

  return (
    <group {...groupProps}>
      {options.theme === "forest" && (
        <>
          <mesh geometry={terrain} receiveShadow castShadow>
            <meshStandardMaterial color="#3e4a2f" roughness={1} metalness={0} />
          </mesh>
          <mesh position={[0, -1.8, 40]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[22, 64]} />
            <meshStandardMaterial color="#3bb8c3" transparent opacity={0.7} />
          </mesh>
        </>
      )}
      <mesh geometry={ribbon} receiveShadow castShadow>
        <meshStandardMaterial color={options.theme === "street" ? asphalt : dirt} roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh geometry={leftStrip} receiveShadow>
        <meshStandardMaterial color={options.theme === "street" ? "#ffffff" : "#4a7a3b"} />
      </mesh>
      <mesh geometry={rightStrip} receiveShadow>
        <meshStandardMaterial color={options.theme === "street" ? "#ffffff" : "#4a7a3b"} />
      </mesh>

      {options.theme === "street" ? (
        <>
          <instancedMesh ref={coneRef} args={[undefined as any, undefined as any, counts.cone]} castShadow receiveShadow>
            <coneGeometry args={[0.22, 0.38, 16]} />
            <meshStandardMaterial color="#ff7d21" />
          </instancedMesh>
          <instancedMesh ref={bollardRef} args={[undefined as any, undefined as any, counts.bollard]} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
            <meshStandardMaterial color="#ffd95e" />
          </instancedMesh>
          <instancedMesh ref={barrierRef} args={[undefined as any, undefined as any, counts.barrier]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 0.45, 0.2]} />
            <meshStandardMaterial color="#d9d9d9" />
          </instancedMesh>
        </>
      ) : (
        <>
          <instancedMesh ref={rockRef} args={[undefined as any, undefined as any, counts.rock]} castShadow receiveShadow>
            <icosahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color="#848484" roughness={1} />
          </instancedMesh>
          <instancedMesh ref={logRef} args={[undefined as any, undefined as any, counts.log]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.18, 2.0, 10]} />
            <meshStandardMaterial color="#6b4729" />
          </instancedMesh>
          <instancedMesh ref={stumpRef} args={[undefined as any, undefined as any, counts.stump]} castShadow receiveShadow>
            <cylinderGeometry args={[0.26, 0.28, 0.5, 12]} />
            <meshStandardMaterial color="#6b4729" />
          </instancedMesh>
          <instancedMesh ref={treeRef} args={[undefined as any, undefined as any, counts.trees]} castShadow receiveShadow>
            <coneGeometry args={[0.8, 1.8, 7]} />
            <meshStandardMaterial color="#2e6c3a" />
          </instancedMesh>
        </>
      )}
    </group>
  );
}

// ---------------- Premium Scene Wrapper ----------------
export function PremiumTrackDemo({
  options, followIndex = 0, onAnimalsReady, onPositions, onPhase, raceId = 0, animalsConfig
}: {
  options: TrackOptions;
  followIndex?: number;
  onAnimalsReady?: (list: { name: string; color: string }[]) => void;
  onPositions?: (rows: { index: number; name: string; color: string; progress: number; finished: boolean; rank: number; time?: number }[]) => void;
  onPhase?: (p: { phase: 'idle'|'countdown'|'running'|'finished'; countdown?: number }) => void;
  raceId?: number;
  animalsConfig?: AnimalSpec[];
}) {
  const heightAt = useMemo(() => makeHeightFn(options.seed), [options.seed]);
  const curve = useMemo(() => generateCenterline(options, heightAt), [options, heightAt]);
  const totalLen = useMemo(() => curve.getLength(), [curve]);
  const controls: any = useThree((s) => (s as any).controls);

  const animals = useMemo(() => {
    const base = (animalsConfig && animalsConfig.length)
      ? animalsConfig
      : new Array(6).fill(0).map((_, i) => ({ name: ANIMAL_NAMES[i % ANIMAL_NAMES.length] }));
    return base.map((spec, i) => ({
      name: spec.name ?? ANIMAL_NAMES[i % ANIMAL_NAMES.length],
      color: new THREE.Color(spec.color ?? new THREE.Color().setHSL((i * 0.12) % 1, 0.65, 0.55)),
      url: spec.url,
      clip: spec.clip,
      scale: spec.scale ?? 1,
      yaw: spec.yaw ?? 0,
      speed: spec.speed,
      fitHeight: spec.fitHeight,
    }));
  }, [animalsConfig, options.seed]);

  React.useEffect(() => {
    onAnimalsReady?.(animals.map((a) => ({ name: a.name, color: `#${(a.color as THREE.Color).getHexString()}` })));
    animals.forEach((a) => a.url && useGLTF.preload(a.url as string));
  }, [animals, onAnimalsReady]);

  const animalRefs = useRef<THREE.Group[]>([]);

  useFrame(({ camera }, dt) => {
    const g = animalRefs.current[followIndex];
    if (g) {
      const target = new THREE.Vector3(); g.getWorldPosition(target);
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion).normalize();
      const desired = target.clone().add(forward.clone().multiplyScalar(-6)).add(new THREE.Vector3(0, 3.2, 0));
      const a = 1 - Math.pow(0.001, dt || 0.016);
      camera.position.lerp(desired, a);
      camera.lookAt(target);
      if (controls) { controls.target.lerp(target, a * 0.9); controls.update?.(); }
    } else {
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 10, 0.03);
    }
  });

  return (
    <>
      <color attach="background" args={["#0e121a"]} />
      <fog attach="fog" args={["#0e121a", 50, 220]} />
      <hemisphereLight intensity={0.4} color="#9fb3d4" groundColor="#1b202b" />
      <directionalLight position={[10, 18, 8]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <Environment preset="city" />
      <ContactShadows position={[0, 0, 0]} opacity={0.45} blur={2.8} far={14} resolution={1024} />

      <ProceduralTrack options={options} />

      {/* Start & Finish */}
      <StartFinishGantry curve={curve} trackWidth={options.trackWidth} />
      <FinishLine curve={curve} trackWidth={options.trackWidth} />
      {options.theme === "street" && (
        <CenterDashes curve={curve} width={options.trackWidth} dash={2} gap={1} />
      )}

      <DemoAnimals
        curve={curve}
        width={options.trackWidth}
        totalLen={totalLen}
        animals={animals}
        outRefs={animalRefs}
        raceId={raceId}
        onPositions={onPositions}
        onPhase={onPhase}
      />

      <OrbitControls makeDefault enableDamping dampingFactor={0.06} />
    </>
  );
}

/** -------- Start line gantry -------- */
function makeCheckerTexture(cols = 10, rows = 2) {
  const c = document.createElement('canvas'); c.width = cols * 16; c.height = rows * 16;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { ctx.fillStyle = (x + y) % 2 === 0 ? '#fff' : '#111'; ctx.fillRect(x * 16, y * 16, 16, 16); }
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
}

function StartFinishGantry({ curve, trackWidth }: { curve: THREE.Curve<THREE.Vector3>; trackWidth: number }) {
  const t = 0.02; // just after 0 to avoid degenerate tangent
  const p = curve.getPoint(t); const tan = curve.getTangent(t).normalize();
  const angle = Math.atan2(tan.x, tan.z); const y = p.y + 0.01;
  const checker = useMemo(() => makeCheckerTexture(12, 2), []);
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, angle, 0]}>
      <mesh position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[trackWidth, 0.01, 0.9]} />
        <meshStandardMaterial map={checker} color="#ffffff" />
      </mesh>
      <mesh position={[trackWidth / 2 + 0.25, y + 1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 2.4, 10]} />
        <meshStandardMaterial color="#684b2a" />
      </mesh>
      <mesh position={[-trackWidth / 2 - 0.25, y + 1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 2.4, 10]} />
        <meshStandardMaterial color="#684b2a" />
      </mesh>
      <mesh position={[0, y + 2.1, 0]} castShadow>
        <boxGeometry args={[trackWidth + 0.8, 0.2, 0.2]} />
        <meshStandardMaterial color="#1e90ff" />
      </mesh>
    </group>
  );
}

/** -------- Finish line near end of course -------- */
function FinishLine({ curve, trackWidth }: { curve: THREE.Curve<THREE.Vector3>; trackWidth: number }) {
  const t = 0.98;
  const p = curve.getPoint(t); const tan = curve.getTangent(t).normalize();
  const angle = Math.atan2(tan.x, tan.z); const y = p.y + 0.01;
  const checker = useMemo(() => makeCheckerTexture(12, 2), []);
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, angle, 0]}>
      <mesh position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[trackWidth, 0.01, 0.9]} />
        <meshStandardMaterial map={checker} color="#ffffff" />
      </mesh>
      <mesh position={[trackWidth / 2 + 0.25, y + 1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 2.4, 10]} />
        <meshStandardMaterial color="#684b2a" />
      </mesh>
      <mesh position={[-trackWidth / 2 - 0.25, y + 1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 2.4, 10]} />
        <meshStandardMaterial color="#684b2a" />
      </mesh>
      <mesh position={[0, y + 2.1, 0]} castShadow>
        <boxGeometry args={[trackWidth + 0.8, 0.2, 0.2]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

/** -------- Center dashed line (street style) -------- */
function CenterDashes({ curve, width, dash = 2, gap = 1 }: { curve: THREE.Curve<THREE.Vector3>; width: number; dash?: number; gap?: number; }) {
  const totalLen = useMemo(() => (curve as any).getLength(), [curve]);
  const count = Math.max(1, Math.floor(totalLen / (dash + gap)) - 1);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current; if (!mesh) return; const mat = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const s = (i * (dash + gap) + dash * 0.5) / totalLen;
      const p = curve.getPointAt(s); const tan = curve.getTangentAt(s).normalize();
      const angle = Math.atan2(tan.x, tan.z);
      mat.makeRotationY(angle); mat.setPosition(p.x, p.y + 0.005, p.z);
      const scale = new THREE.Matrix4().makeScale(0.08, 0.01, dash);
      mesh.setMatrixAt(i, mat.multiply(scale));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [curve, count, dash, gap, totalLen]);
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" />
    </instancedMesh>
  );
}

/** -------- Skinned GLB animal with clip playback -------- */
function SkinnedAnimal({
  url, clip, scale = 1, yaw = 0, gait = 1, fitHeight
}: { url: string; clip?: string; scale?: number; yaw?: number; gait?: number; fitHeight?: number }) {
  const root = React.useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url) as any;
  const { actions, names, mixer } = useAnimations(animations, root);

  // Compute scale from bounding box if fitHeight is provided
  const computedScale = React.useMemo(() => {
    if (!scene || !fitHeight) return scale;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0) return (scale ?? 1) * (fitHeight / size.y);
    return scale;
  }, [scene, scale, fitHeight]);

  React.useLayoutEffect(() => {
    scene.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const bbox = new THREE.Box3().setFromObject(scene);
    const yOffset = -bbox.min.y * (computedScale ?? 1);
    if (root.current) root.current.position.y = yOffset; // put feet on ground
  }, [scene, computedScale]);

  React.useEffect(() => {
    const name = (clip && actions[clip]) ? clip : (names[0] ?? undefined);
    const action = name ? actions[name] : undefined;
    action?.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
    return () => { Object.values(actions).forEach((a: any) => a?.fadeOut(0.1)); };
  }, [clip, actions, names]);

  React.useEffect(() => { if (mixer) mixer.timeScale = gait ?? 1; }, [gait, mixer]);

  return (
    <group ref={root} rotation={[0, yaw, 0]} scale={computedScale}>
      <primitive object={scene} />
    </group>
  );
}

/** -------- Demo animals with race logic -------- */
function DemoAnimals({
  curve, width, totalLen, animals = [], outRefs, raceId = 0, onPositions, onPhase
}: {
  curve: THREE.Curve<THREE.Vector3>;
  width: number;
  totalLen: number;
  animals?: Array<{ name: string; color: THREE.Color; url?: string; clip?: string; scale?: number; yaw?: number; speed?: number; fitHeight?: number }>;
  outRefs: React.MutableRefObject<THREE.Group[]>;
  raceId?: number;
  onPositions?: (rows: { index: number; name: string; color: string; progress: number; finished: boolean; rank: number; time?: number }[]) => void;
  onPhase?: (p: { phase: 'idle'|'countdown'|'running'|'finished'; countdown?: number }) => void;
}) {
  const startU = 0.02; const finishU = 0.98;

  const safeAnimals = animals && animals.length
    ? animals
    : new Array(6).fill(0).map((_, i) => ({ name: ANIMAL_NAMES[i % ANIMAL_NAMES.length], color: new THREE.Color().setHSL((i * 0.12) % 1, 0.65, 0.55) } as any));

  // NEW: compute evenly spaced lanes across the track
  const lanes = React.useMemo(() => computeLanes(safeAnimals.length, width, 0.9), [safeAnimals.length, width]);

  const herd = useRef(
    safeAnimals.map((a: any, i: number) => ({
      name: a.name,
      u: startU,
      speed: (a.speed ?? (3.2 + Math.random() * 1.6)),
      lane: lanes[i],                         // evenly spaced
      color: a.color,
      url: a.url,
      clip: a.clip,
      scale: a.scale ?? 1,
      yaw: a.yaw ?? 0,
      fitHeight: a.fitHeight,
      step: Math.random() * Math.PI * 2,
      finished: false,
      time: 0,
    })) as any
  );

  // Keep lanes in sync if width or count changes during runtime
  React.useEffect(() => {
    const L = computeLanes(safeAnimals.length, width, 0.9);
    herd.current.forEach((h: any, i: number) => { h.lane = L[i]; });
  }, [safeAnimals.length, width]);

  const roots = useRef<THREE.Group[]>([]);
  const legs = useRef<Array<{ lf?: THREE.Group; rf?: THREE.Group; lb?: THREE.Group; rb?: THREE.Group }>>([]);
  const raceRef = useRef<{ phase: 'idle'|'countdown'|'running'|'finished'; countdown: number; finishedCount: number; clock: number }>({ phase: 'idle', countdown: 3, finishedCount: 0, clock: 0 });

  React.useEffect(() => {
    herd.current.forEach((h: any) => { h.u = startU; h.finished = false; h.time = 0; h.step = Math.random() * Math.PI * 2; });
    raceRef.current = { phase: 'countdown', countdown: 3, finishedCount: 0, clock: 0 };
    onPhase?.({ phase: 'countdown', countdown: 3 });
  }, [raceId]);

  useFrame((_, dt) => {
    const rstate = raceRef.current; const arr = herd.current; rstate.clock += dt;
    if (rstate.phase === 'countdown') {
      rstate.countdown -= dt; const whole = Math.ceil(Math.max(0, rstate.countdown)); onPhase?.({ phase: 'countdown', countdown: whole });
      if (rstate.countdown <= 0) { rstate.phase = 'running'; onPhase?.({ phase: 'running' }); }
    } else if (rstate.phase === 'running') {
      arr.forEach((a: any) => {
        if (a.finished) return;
        a.u += (a.speed * dt) / totalLen;
        if (a.u >= finishU) { a.u = finishU; a.finished = true; a.time = rstate.clock; rstate.finishedCount += 1; if (rstate.finishedCount === arr.length) { rstate.phase = 'finished'; onPhase?.({ phase: 'finished' }); } }
      });
    }

    const r = roots.current;
    arr.forEach((a: any, i: number) => {
      const p = curve.getPointAt(a.u); const tan = curve.getTangentAt(a.u).normalize();
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const pos = p.clone().add(n.multiplyScalar(THREE.MathUtils.clamp(a.lane, -width/2 + 0.5, width/2 - 0.5)));
      const g = r[i]; if (!g) return; g.position.copy(pos); g.rotation.y = Math.atan2(tan.x, tan.z);

      // Only animate placeholder legs
      const amp = 0.6; const phase = (a.step += dt * (a.finished ? 0 : a.speed * 2.2));
      const L = legs.current[i]; if (L?.lf) L.lf.rotation.x = Math.sin(phase) * amp; if (L?.rb) L.rb.rotation.x = Math.sin(phase) * amp; if (L?.rf) L.rf.rotation.x = Math.sin(phase + Math.PI) * amp; if (L?.lb) L.lb.rotation.x = Math.sin(phase + Math.PI) * amp;
    });

    const denom = (finishU - startU) || 1;
    const rows = arr
      .map((a: any, i: number) => ({
        index: i,
        name: a.name,
        color: `#${(a.color as THREE.Color).getHexString()}`,
        progress: THREE.MathUtils.clamp((a.u - startU) / denom, 0, 1),
        finished: a.finished,
        time: a.time || undefined,
      }))
      .sort((A: any, B: any) => (B.progress - A.progress) || ((A.time ?? Infinity) - (B.time ?? Infinity)))
      .map((r: any, idx: number) => ({ ...r, rank: idx + 1 }));

    onPositions?.(rows);
    if (outRefs) outRefs.current = roots.current;
  });

  return (
    <group>
      {herd.current.map((a: any, i: number) => {
        // Pick animation clip based on raceRef.current.phase
        let animClip = a.clip;
        const phase = raceRef.current?.phase;
        if (phase === 'countdown') animClip = 'Idle';
        if (phase === 'running') animClip = 'Gallop';
        return (
          <group key={i} ref={(el) => { if (el) { roots.current[i] = el; outRefs.current[i] = el; } }}>
            {a.url ? (
              <SkinnedAnimal
                url={a.url as string}
                clip={animClip}
                scale={a.scale}
                yaw={a.yaw}
                gait={a.speed ? a.speed / 3.5 : 1}
                fitHeight={a.fitHeight}
              />
            ) : (
              <>
                {/* Placeholder primitive if no model provided */}
                <mesh position={[0, 0.55, 0]} castShadow>
                  <boxGeometry args={[1.2, 0.5, 0.6]} />
                  <meshStandardMaterial color={a.color} />
                </mesh>
                <mesh position={[0, 0.72, 0.36]} castShadow>
                  <boxGeometry args={[0.16, 0.25, 0.18]} />
                  <meshStandardMaterial color={(a.color as THREE.Color).clone().offsetHSL(0, 0, -0.1)} />
                </mesh>
                <mesh position={[0, 0.86, 0.48]} castShadow>
                  <sphereGeometry args={[0.16, 12, 12]} />
                  <meshStandardMaterial color={a.color} />
                </mesh>
                <mesh position={[0, 0.75, -0.36]} castShadow>
                  <coneGeometry args={[0.06, 0.25, 6]} />
                  <meshStandardMaterial color={(a.color as THREE.Color).clone().offsetHSL(0, 0, -0.15)} />
                </mesh>
                {/* Placeholder legs for primitives only */}
                <group ref={(el) => { if (!legs.current[i]) legs.current[i] = {}; legs.current[i].lf = el!; }} position={[0.28, 0.4, 0.22]}>
                  <mesh position={[0, -0.22, 0]} castShadow>
                    <boxGeometry args={[0.12, 0.44, 0.12]} />
                    <meshStandardMaterial color="#5a3d1e" />
                  </mesh>
                </group>
                <group ref={(el) => { if (!legs.current[i]) legs.current[i] = {}; legs.current[i].rf = el!; }} position={[-0.28, 0.4, 0.22]}>
                  <mesh position={[0, -0.22, 0]} castShadow>
                    <boxGeometry args={[0.12, 0.44, 0.12]} />
                    <meshStandardMaterial color="#5a3d1e" />
                  </mesh>
                </group>
                <group ref={(el) => { if (!legs.current[i]) legs.current[i] = {}; legs.current[i].lb = el!; }} position={[0.28, 0.4, -0.22]}>
                  <mesh position={[0, -0.22, 0]} castShadow>
                    <boxGeometry args={[0.12, 0.44, 0.12]} />
                    <meshStandardMaterial color="#5a3d1e" />
                  </mesh>
                </group>
                <group ref={(el) => { if (!legs.current[i]) legs.current[i] = {}; legs.current[i].rb = el!; }} position={[-0.28, 0.4, -0.22]}>
                  <mesh position={[0, -0.22, 0]} castShadow>
                    <boxGeometry args={[0.12, 0.44, 0.12]} />
                    <meshStandardMaterial color="#5a3d1e" />
                  </mesh>
                </group>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
