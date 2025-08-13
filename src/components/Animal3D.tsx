import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, BoxGeometry, MeshBasicMaterial } from 'three'
import type { RaceAnimal } from '../game/types'

interface Animal3DProps {
  animal: RaceAnimal
  color?: string
}

export function Animal3D({ animal, color = '#8B4513' }: Animal3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<Mesh>(null)
  const headRef = useRef<Mesh>(null)
  const legs = useRef<Mesh[]>([])
  
  const bodyGeometry = useMemo(() => new BoxGeometry(2, 1, 4), [])
  const headGeometry = useMemo(() => new BoxGeometry(1.5, 1.2, 2), [])
  const legGeometry = useMemo(() => new BoxGeometry(0.3, 2, 0.3), [])
  
  const bodyMaterial = useMemo(() => new MeshBasicMaterial({ color }), [color])
  const headMaterial = useMemo(() => new MeshBasicMaterial({ color: color }), [color])
  const legMaterial = useMemo(() => new MeshBasicMaterial({ color: '#654321' }), [])
  
  // Update position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(animal.position.x, animal.position.y + 1, animal.position.z)
      
      // Calculate rotation based on movement direction
      if (animal.velocity.x !== 0 || animal.velocity.z !== 0) {
        const angle = Math.atan2(animal.velocity.x, animal.velocity.z)
        groupRef.current.rotation.y = angle
      }
    }
  }, [animal.position, animal.velocity])

  // Simple running animation
  useFrame((state) => {
    if (legs.current.length > 0 && animal.currentSpeed > 0) {
      const time = state.clock.getElapsedTime()
      const speed = animal.currentSpeed / 10
      
      legs.current.forEach((leg, index) => {
        if (leg) {
          const offset = (index % 2) * Math.PI
          leg.rotation.x = Math.sin(time * speed * 8 + offset) * 0.3
        }
      })
      
      // Bob the body slightly
      if (bodyRef.current) {
        bodyRef.current.position.y = Math.sin(time * speed * 16) * 0.1
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh ref={bodyRef} geometry={bodyGeometry} material={bodyMaterial} position={[0, 0, 0]} />
      
      {/* Head */}
      <mesh ref={headRef} geometry={headGeometry} material={headMaterial} position={[0, 0.5, -2.5]} />
      
      {/* Legs */}
      {[
        [-0.7, -1.5, -1],
        [0.7, -1.5, -1],
        [-0.7, -1.5, 1],
        [0.7, -1.5, 1]
      ].map((position, index) => (
        <mesh
          key={index}
          ref={el => { if (el) legs.current[index] = el }}
          geometry={legGeometry}
          material={legMaterial}
          position={position}
        />
      ))}
      
      {/* Simple antlers for deer */}
      <mesh geometry={legGeometry} material={legMaterial} position={[-0.3, 1.5, -2.5]} rotation={[0, 0, 0.3]} />
      <mesh geometry={legGeometry} material={legMaterial} position={[0.3, 1.5, -2.5]} rotation={[0, 0, -0.3]} />
      
      {/* Name tag */}
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3, 0.8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}