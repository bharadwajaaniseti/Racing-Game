import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, RingGeometry, MeshBasicMaterial, DoubleSide } from 'three'

interface Track3DProps {
  radius?: number
}

export function Track3D({ radius = 50 }: Track3DProps) {
  const trackRef = useRef<Mesh>(null)
  
  const trackGeometry = useMemo(() => {
    return new RingGeometry(radius - 5, radius + 5, 64)
  }, [radius])

  const trackMaterial = useMemo(() => {
    return new MeshBasicMaterial({ 
      color: '#333333',
      side: DoubleSide,
      transparent: true,
      opacity: 0.8
    })
  }, [])

  const innerLineGeometry = useMemo(() => {
    return new RingGeometry(radius - 5.2, radius - 4.8, 64)
  }, [radius])

  const outerLineGeometry = useMemo(() => {
    return new RingGeometry(radius + 4.8, radius + 5.2, 64)
  }, [radius])

  const lineMaterial = useMemo(() => {
    return new MeshBasicMaterial({ 
      color: '#ffffff',
      side: DoubleSide,
      transparent: true,
      opacity: 0.9
    })
  }, [])

  const grassGeometry = useMemo(() => {
    return new RingGeometry(0, radius - 5, 64)
  }, [radius])

  const grassMaterial = useMemo(() => {
    return new MeshBasicMaterial({ 
      color: '#2d5016',
      side: DoubleSide,
      transparent: true,
      opacity: 0.7
    })
  }, [])

  return (
    <group>
      {/* Grass inside track */}
      <mesh geometry={grassGeometry} material={grassMaterial} rotation={[-Math.PI / 2, 0, 0]} />
      
      {/* Main track */}
      <mesh ref={trackRef} geometry={trackGeometry} material={trackMaterial} rotation={[-Math.PI / 2, 0, 0]} />
      
      {/* Track lines */}
      <mesh geometry={innerLineGeometry} material={lineMaterial} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={outerLineGeometry} material={lineMaterial} rotation={[-Math.PI / 2, 0, 0]} />
      
      {/* Start/Finish line */}
      <mesh position={[0, 0.1, -radius]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      
      {/* Start/Finish text indicator */}
      <mesh position={[0, 1, -radius - 8]} rotation={[0, 0, 0]}>
        <planeGeometry args={[8, 2]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.9} />
      </mesh>
    </group>
  )
}