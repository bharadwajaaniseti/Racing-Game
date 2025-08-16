import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PremiumTrackDemo, TrackOptions } from "../components/ProceduralTrack";

export default function Race() {
  const [seed, setSeed] = useState("forest-elite");
  const [theme, setTheme] = useState<"street" | "forest">("forest");
  const [segmentCount, setSegmentCount] = useState(100);
  const [segmentLength, setSegmentLength] = useState(8);
  const [trackWidth, setTrackWidth] = useState(5);
  const [curveChance, setCurveChance] = useState(0.55);
  const [maxCurveAngleDeg, setMaxCurveAngleDeg] = useState(22);
  const [obstacleDensity, setObstacleDensity] = useState(0.55);

  const [followIdx, setFollowIdx] = useState(0);
  const [animalsUI, setAnimalsUI] = useState<{ name: string; color: string }[]>([]);

  // NEW: race state
  const [raceId, setRaceId] = useState(0);
  const [phase, setPhase] = useState<'idle'|'countdown'|'running'|'finished'>('idle');
  const [countdown, setCountdown] = useState<number>(0);
  const [positions, setPositions] = useState<{ index: number; name: string; color: string; progress: number; finished: boolean; rank: number; time?: number }[]>([]);

  const options: TrackOptions = useMemo(() => ({
    seed, theme, segmentCount, segmentLength, trackWidth, curveChance, maxCurveAngleDeg, obstacleDensity,
  }), [seed, theme, segmentCount, segmentLength, trackWidth, curveChance, maxCurveAngleDeg, obstacleDensity]);

  function randomizeSeed() { setSeed(Math.random().toString(36).slice(2, 8)); }
  function startRace() { setRaceId((n) => n + 1); setPhase('countdown'); setFollowIdx(0); }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0b1220,#0e131c)", color: "#e5eefb" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Racing Arena – Premium Track</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
          {/* Canvas Panel */}
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #1f2a3b", background: "#0b1018" }}>
            <div style={{ height: 560, position: 'relative' }}>
              <Canvas camera={{ position: [0, 10, -18], fov: 50 }} dpr={[1, 1.5]} shadows>
                <PremiumTrackDemo
                  options={options}
                  followIndex={followIdx}
                  onAnimalsReady={setAnimalsUI}
                  onPositions={setPositions}
                  onPhase={(p) => { setPhase(p.phase); if (p.countdown !== undefined) setCountdown(p.countdown); }}
                  raceId={raceId}
                />
              </Canvas>
            </div>
          </div>

          {/* Controls */}
          <div style={{ border: "1px solid #1f2a3b", background: "#0b1018", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={startRace} style={{ padding: '8px 12px', borderRadius: 8, background: '#1c7c54', border: 0, color: '#dfe9ff', fontWeight: 700 }}>
                  {phase === 'running' ? 'Restart' : phase === 'finished' ? 'Restart' : 'Start Race'}
                </button>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#0c1422', border: '1px solid #1f2a3b' }}>
                  {phase === 'countdown' ? `Starts in ${countdown}` : phase === 'running' ? 'Running' : phase === 'finished' ? 'Finished' : 'Idle'}
                </div>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ opacity: 0.9 }}>Seed</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "#0c1422", border: "1px solid #1f2a3b", color: "#dfe9ff" }} />
                  <button onClick={randomizeSeed} style={{ padding: "8px 12px", borderRadius: 8, background: "#183657", border: 0, color: "#dfe9ff" }}>Random</button>
                </div>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ opacity: 0.9 }}>Theme</span>
                <select value={theme} onChange={(e) => setTheme(e.target.value as any)} style={{ padding: "8px 10px", borderRadius: 8, background: "#0c1422", border: "1px solid #1f2a3b", color: "#dfe9ff" }}>
                  <option value="street">Street</option>
                  <option value="forest">Forest</option>
                </select>
              </label>

              <Slider label="Segments" min={60} max={140} value={segmentCount} onChange={setSegmentCount} />
              <Slider label="Length" min={6} max={12} value={segmentLength} onChange={setSegmentLength} />
              <Slider label="Width" min={3} max={7} value={trackWidth} onChange={setTrackWidth} step={0.1} />
              <Slider label="Curve Chance" min={0} max={1} step={0.01} value={curveChance} onChange={setCurveChance} />
              <Slider label="Max Curve Angle" min={5} max={25} value={maxCurveAngleDeg} onChange={setMaxCurveAngleDeg} />
              <Slider label="Obstacle Density" min={0} max={1} step={0.01} value={obstacleDensity} onChange={setObstacleDensity} />

              {/* Racers to follow */}
              <div style={{ borderTop: "1px solid #1f2a3b", paddingTop: 12, marginTop: 6 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Racers</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {animalsUI.length === 0 ? (
                    <div style={{ opacity: 0.7, fontSize: 12 }}>Generating…</div>
                  ) : (
                    animalsUI.map((a, idx) => (
                      <button key={idx} onClick={() => setFollowIdx(idx)}
                        style={{ display: "flex", alignItems: "center", justifyContent: 'space-between', gap: 8, padding: "8px 10px", borderRadius: 10, background: idx === followIdx ? "#16324a" : "#0c1422", border: `1px solid ${idx === followIdx ? "#2d74c4" : "#1f2a3b"}`, color: "#dfe9ff" }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 999, background: a.color }} />
                          <span>{a.name}</span>
                        </span>
                        <span style={{ opacity: 0.7, fontSize: 12 }}>
                          {positions.find(p => p.index === idx)?.rank ?? '-'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Live Positions */}
              <div style={{ borderTop: "1px solid #1f2a3b", paddingTop: 12, marginTop: 6 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Positions</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {positions.map((p) => (
                    <div key={p.index} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: '#0c1422', border: '1px solid #1f2a3b' }}>
                      <div style={{ width: 20, textAlign: 'right', fontWeight: 800 }}>{p.rank}</div>
                      <span style={{ width: 12, height: 12, borderRadius: 999, background: p.color }} />
                      <div style={{ flex: 1 }}>{p.name}</div>
                      <div style={{ width: 60, textAlign: 'right', opacity: 0.7 }}>{Math.round(p.progress * 100)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ opacity: 0.7, fontSize: 12 }}>Click a racer to follow the camera. Press Start to run a synchronized race. Race ends when the last animal reaches the finish line.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, min, max, value, onChange, step = 1 }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ opacity: 0.9 }}>{label}: <span style={{ opacity: 0.7 }}>{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
