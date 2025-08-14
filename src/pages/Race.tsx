import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei'
import { Play, Square, RotateCcw } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useGarage } from '../store/useGarage'
import { Track3D } from '../components/Track3D'
import { Animal3D } from '../components/Animal3D'
import { RaceHUD } from '../components/RaceHUD'
import { RaceSimulation } from '../game/sim'
import type { Race, RaceAnimal } from '../game/types'

export function Race() {
  const { user } = useUser()
  const { animals, fetchAnimals } = useGarage()
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null)
  const [race, setRace] = useState<Race | null>(null)
  const [isRacing, setIsRacing] = useState(false)
  const [leaderboard, setLeaderboard] = useState<RaceAnimal[]>([])
  const simulationRef = useRef<RaceSimulation | null>(null)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (user) {
      fetchAnimals()
    }
  }, [user, fetchAnimals])

  useEffect(() => {
    if (animals.length > 0 && !selectedAnimal) {
      setSelectedAnimal(animals[0].id)
    }
  }, [animals, selectedAnimal])

  const generateBotAnimals = () => {
    const botNames = ['Lightning Bolt', 'Thunder Hooves', 'Swift Wind', 'Storm Chaser']
    return botNames.map((name, index) => ({
      id: `bot-${index}`,
      user_id: 'bot',
      name,
      type: 'deer',
      speed: Math.floor(Math.random() * 30) + 45,
      acceleration: Math.floor(Math.random() * 30) + 45,
      stamina: Math.floor(Math.random() * 30) + 45,
      temper: Math.floor(Math.random() * 40) + 30,
      experience: Math.floor(Math.random() * 500),
      level: Math.floor(Math.random() * 5) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  }

  const startRace = () => {
    if (!selectedAnimal) return

    const playerAnimal = animals.find(a => a.id === selectedAnimal)
    if (!playerAnimal) return

    const botAnimals = generateBotAnimals()
    const allAnimals = [playerAnimal, ...botAnimals]

    simulationRef.current = new RaceSimulation(allAnimals)
    setRace(simulationRef.current.getRace())
    setIsRacing(true)
    lastTimeRef.current = performance.now()
    
    const animate = (currentTime: number) => {
      if (!simulationRef.current || !isRacing) return

      const deltaTime = (currentTime - lastTimeRef.current) / 1000
      lastTimeRef.current = currentTime

      const updatedRace = simulationRef.current.update(deltaTime)
      setRace(updatedRace)
      setLeaderboard(simulationRef.current.getLeaderboard())

      if (updatedRace.status === 'racing') {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsRacing(false)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  const stopRace = () => {
    setIsRacing(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  const resetRace = () => {
    stopRace()
    setRace(null)
    setLeaderboard([])
    simulationRef.current = null
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const getAnimalColor = (animal: RaceAnimal) => {
    if (animal.user_id !== 'bot') return '#4F46E5' // Player color
    const colors = ['#EF4444', '#10B981', '#F59E0B', '#8B5CF6']
    const index = parseInt(animal.id.split('-')[1]) || 0
    return colors[index % colors.length]
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Please sign in to access racing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Racing Arena</h1>

        {/* Animal Selection */}
        {!race && (
          <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Choose Your Racer</h3>
            {animals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You need at least one deer to race!</p>
                <a
                  href="/garage"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  Go to Garage
                </a>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {animals.map((animal) => (
                  <button
                    key={animal.id}
                    onClick={() => setSelectedAnimal(animal.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedAnimal === animal.id
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-white font-bold mb-2">{animal.name}</div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>Speed: {animal.speed}</div>
                      <div>Acceleration: {animal.acceleration}</div>
                      <div>Stamina: {animal.stamina}</div>
                      <div>Level: {animal.level}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Race Controls */}
        <div className="mb-8 flex justify-center space-x-4">
          {!race ? (
            <button
              onClick={startRace}
              disabled={!selectedAnimal}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-all flex items-center space-x-2"
            >
              <Play className="h-6 w-6" />
              <span>Start Race</span>
            </button>
          ) : (
            <div className="flex space-x-4">
              {isRacing && (
                <button
                  onClick={stopRace}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2"
                >
                  <Square className="h-5 w-5" />
                  <span>Stop</span>
                </button>
              )}
              <button
                onClick={resetRace}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* 3D Race View */}
        <div className="relative h-96 md:h-[600px] bg-gray-800/30 rounded-xl border border-cyan-500/30 overflow-hidden">
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 50, 60]} />
            <OrbitControls 
              enablePan={true} 
              enableZoom={true} 
              enableRotate={true}
              maxPolarAngle={Math.PI / 2.2}
              minDistance={20}
              maxDistance={150}
            />
            
            {/* Consistent lighting with ModelViewer */}
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
            
            <Track3D radius={50} />
            
            {race && race.animals.map((animal) => (
              <Animal3D 
                key={animal.id} 
                animal={animal} 
                color={getAnimalColor(animal)}
              />
            ))}
          </Canvas>

          {/* Overlay HUD */}
          {race && (
            <RaceHUD race={race} leaderboard={leaderboard} />
          )}
        </div>

        {/* Instructions */}
        {!race && (
          <div className="mt-8 bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20">
            <h3 className="text-lg font-bold text-white mb-3">How to Race</h3>
            <div className="text-gray-300 space-y-2">
              <p>1. Select one of your deer from above</p>
              <p>2. Click "Start Race" to begin a 3-lap race against AI opponents</p>
              <p>3. Watch the 3D action and monitor stats in real-time</p>
              <p>4. Use mouse to rotate and zoom the camera view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}