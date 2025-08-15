import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Package, ArrowLeft, Info as InfoIcon } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useBarn } from '../store/useBarn'
import { useInventory } from '../store/useInventory'
import { ModelViewer } from '../components/ModelViewer'
import { supabase } from '../lib/supabase'
import type { Animal, MarketItem, InventoryItem } from '../game/types'
import toast from 'react-hot-toast'

export function AnimalDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { animals, fetchAnimals } = useBarn()
  const { items: inventory, fetchInventory } = useInventory()
  
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [feeding, setFeeding] = useState(false)
  const [hungerLevel, setHungerLevel] = useState(100) // 100 is full, 0 is hungry
  const [currentAnimation, setCurrentAnimation] = useState("")
  const [viewMode, setViewMode] = useState<'model' | 'animations'>('model')
  const [showInfo, setShowInfo] = useState(false)
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false)

  const foodItems = Object.entries(inventory || {}).reduce<InventoryItem[]>((acc, [id, item]) => {
    if (item.type === 'food') acc.push({ ...item, id })
    return acc
  }, [])

  const otherItems = Object.entries(inventory || {}).reduce<InventoryItem[]>((acc, [id, item]) => {
    if (item.type !== 'food') acc.push({ ...item, id })
    return acc
  }, [])

  useEffect(() => {
    if (user && id) {
      fetchAnimalDetails()
      fetchInventory()
    }
  }, [user, id, fetchInventory])

  const fetchAnimalDetails = async () => {
    setLoading(true)
    try {
      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .select('*')
        .eq('id', id)
        .single()

      if (animalError) throw animalError
      if (!animalData) throw new Error('Animal not found')

      setAnimal(animalData)
      setHungerLevel(animalData.hunger_level ?? 100)
    } catch (error: any) {
      toast.error('Failed to load animal details')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedAnimal = async (foodId: string, recoveryAmount: number) => {
    if (!animal || feeding) return

    setFeeding(true)
    try {
      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', foodId)
      if (inventoryError) throw inventoryError

      const newHungerLevel = Math.min(100, hungerLevel + recoveryAmount)

      const { error: animalError } = await supabase
        .from('animals')
        .update({ hunger_level: newHungerLevel })
        .eq('id', animal.id)
      if (animalError) throw animalError

      setHungerLevel(newHungerLevel)
      fetchInventory()
      toast.success('Successfully fed your animal!')
    } catch (error: any) {
      toast.error('Failed to feed animal')
      console.error('Error:', error)
    } finally {
      setFeeding(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Please sign in to view animal details</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  if (!animal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Animal not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/barn')}
            className="mr-4 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-4xl font-bold text-white">{animal.name}</h1>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Side - Stats */}
          <div className="space-y-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <h2 className="text-xl font-bold text-white mb-4">Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Level</span>
                  <span className="text-yellow-400 font-bold">{animal.level}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Speed</span>
                  <span className="text-cyan-400 font-bold">{animal.speed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Acceleration</span>
                  <span className="text-cyan-400 font-bold">{animal.acceleration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Stamina</span>
                  <span className="text-cyan-400 font-bold">{animal.stamina}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Temper</span>
                  <span className="text-cyan-400 font-bold">{animal.temper}</span>
                </div>
                <div className="pt-3 border-t border-gray-600"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Idle Animation</span>
                  <span className="text-purple-400 font-bold">{animal.idle_anim || 'None'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Run Animation</span>
                  <span className="text-purple-400 font-bold">{animal.run_anim || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Hunger Level */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white">Hunger Level</h3>
                <span className={`text-sm font-medium ${
                  hungerLevel > 70 ? 'text-green-400' :
                  hungerLevel > 30 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {hungerLevel}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    hungerLevel > 70 ? 'bg-green-500' :
                    hungerLevel > 30 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${hungerLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Middle - 3D Model */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
            {/* Top Controls */}
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-white">Preview</h2>
                <div className="flex bg-gray-700/50 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('model')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      viewMode === 'model' 
                        ? 'bg-cyan-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Model
                  </button>
                  <button
                    onClick={() => setViewMode('animations')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      viewMode === 'animations' 
                        ? 'bg-cyan-600 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Animations
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setCurrentAnimation("");
                    setIsPlayingAnimation(false);
                    setFeeding(false);
                  }}
                  className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg text-sm"
                >
                  Reset View
                </button>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg"
                >
                  <InfoIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Model Viewer */}
            <div className="relative">
              <div className="h-[500px] rounded-lg overflow-hidden">
                <ModelViewer
                  animal={{
                    ...animal,
                    position: { x: 0, y: 0, z: 0 },
                    velocity: { x: 0, y: 0, z: 0 },
                    currentSpeed: currentAnimation === "run" ? 10 : 0,
                    currentStamina: animal.stamina,
                    lap: 0,
                    distance: 0,
                    finished: false
                  }}
                  modelUrl={animal.model_url}
                  scale={animal.model_scale}
                  rotation={animal.model_rotation}
                  isEating={currentAnimation === "eat" || currentAnimation.toLowerCase().includes('eat')}
                  forcedAnimation={currentAnimation}
                  color="#4F46E5"
                  className="h-full"
                  onAnimationsLoaded={setAvailableAnimations}
                />
              </div>

              {/* Animation Controls */}
              {viewMode === 'animations' && (
                <div className="absolute inset-0 bg-gray-800/90 backdrop-blur-sm rounded-lg flex flex-col">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">Available Animations</h3>
                    <p className="text-sm text-gray-400 mt-1">Click an animation to preview it</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableAnimations.map((animName) => (
                        <button
                          key={animName}
                          onClick={() => {
                            console.log('Setting animation to:', animName);
                            setCurrentAnimation(animName);
                            setIsPlayingAnimation(true);
                          }}
                          className={`p-3 rounded-lg border transition-colors ${
                            currentAnimation === animName
                              ? 'bg-cyan-600/20 border-cyan-500 text-white'
                              : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                          }`}
                        >
                          <div className="text-xs text-gray-400 mb-1">Animation</div>
                          <div className="font-medium truncate">{animName}</div>
                        </button>
                      ))}
                      {availableAnimations.length === 0 && (
                        <div className="col-span-3 text-center text-gray-400 py-4">
                          Loading animations...
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-700 flex justify-end">
                    <button
                      onClick={() => {
                        setCurrentAnimation("");
                        setIsPlayingAnimation(false);
                        setViewMode('model');
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Back to Model View
                    </button>
                  </div>
                </div>
              )}

              {/* Info Overlay */}
              {showInfo && (
                <div className="absolute top-4 left-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="font-bold text-white mb-2">Model Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Scale</div>
                      <div className="text-white">{animal.model_scale || 1}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Rotation</div>
                      <div className="text-white">{animal.model_rotation || 0}°</div>
                    </div>
                    {animal.model_url && (
                      <div className="col-span-2">
                        <div className="text-gray-400">Model URL</div>
                        <div className="text-white text-xs truncate">{animal.model_url}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Inventory */}
          <div className="space-y-4">
            {/* Food Items */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <h2 className="text-xl font-bold text-white mb-4">Food Items</h2>
              <div className="space-y-3">
                {foodItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
                        Food
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-green-400">+{item.effect_value}</span>
                      <button
                        onClick={() => handleFeedAnimal(item.id, item.effect_value)}
                        disabled={feeding || hungerLevel >= 100}
                        className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-medium transition-colors"
                      >
                        {feeding ? 'Feeding...' : 'Feed'}
                      </button>
                    </div>
                  </div>
                ))}
                {foodItems.length === 0 && (
                  <p className="text-center text-gray-400">No food items in inventory</p>
                )}
              </div>
            </div>

            {/* Other Items */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <h2 className="text-xl font-bold text-white mb-4">Other Items</h2>
              <div className="space-y-3">
                {otherItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-700/50 rounded-lg p-3 border border-gray-600"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs capitalize ${
                        item.type === 'training' ? 'bg-blue-600' :
                        item.type === 'boost' ? 'bg-purple-600' :
                        'bg-pink-600'
                      } text-white`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                ))}
                {otherItems.length === 0 && (
                  <p className="text-center text-gray-400">No items in inventory</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
