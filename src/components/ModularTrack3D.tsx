import { useMemo } from 'react'
import { Box, Cylinder } from '@react-three/drei'

// Track segment type
export type TrackSegment = {
  type: 'straight' | 'curve',
  length: number,
  angle?: number, // for curves
  obstacles?: { position: number }[]
}

// Example modular track definition
export const modularTrack: TrackSegment[] = [
  { type: 'straight', length: 30, obstacles: [{ position: 15 }] },
  { type: 'curve', length: 20, angle: Math.PI / 4 },
  { type: 'straight', length: 40, obstacles: [{ position: 10 }, { position: 35 }] },
  { type: 'curve', length: 20, angle: -Math.PI / 3 },
  { type: 'straight', length: 30 },
]

export function ModularTrack3D() {
  // Calculate segment positions
  const segments = useMemo(() => {
    let x = 0, y = 0, angle = 0
    return modularTrack.map((seg, i) => {
      const start = { x, y, angle }
      if (seg.type === 'straight') {
        x += Math.cos(angle) * seg.length
        y += Math.sin(angle) * seg.length
      } else if (seg.type === 'curve') {
        angle += seg.angle || 0
        x += Math.cos(angle) * seg.length
        y += Math.sin(angle) * seg.length
      }
      return { ...seg, start, end: { x, y, angle } }
    })
  }, [])

  return (
    <group>
      {segments.map((seg, i) => (
        <>
          {/* Track segment */}
          <Cylinder
            key={`track-${i}`}
            args={[1, 1, seg.length, 16]}
            position={[seg.start.x + (seg.end.x - seg.start.x) / 2, 0, seg.start.y + (seg.end.y - seg.start.y) / 2]}
            rotation={[Math.PI / 2, -seg.start.angle, 0]}
            material-color="#444"
          />
          {/* Obstacles */}
          {seg.obstacles?.map((obs, j) => (
            <Box
              key={`obstacle-${i}-${j}`}
              args={[2, 2, 2]}
              position={[
                seg.start.x + Math.cos(seg.start.angle) * obs.position,
                1,
                seg.start.y + Math.sin(seg.start.angle) * obs.position
              ]}
              material-color="#c90"
            />
          ))}
        </>
      ))}
    </group>
  )
}
