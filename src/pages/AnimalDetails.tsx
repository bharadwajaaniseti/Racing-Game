import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Package, ArrowLeft, Info as InfoIcon } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useBarn } from '../store/useBarn'
import { useInventory } from '../store/useInventory'
import { ModelViewer2 as ModelViewer } from '../components/ModelViewer2'
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
  const [currentAnimation, setCurrentAnimation] = useState("")
  const [viewMode, setViewMode] = useState<'model' | 'animations'>('model')
  const [showInfo, setShowInfo] = useState(false)
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)

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

  // Periodic refresh to update the displayed hunger level
  useEffect(() => {
    if (!animal || loading) return;

    // Fetch updated animal data every minute
    const refreshInterval = setInterval(async () => {
      const { data: updatedAnimal, error } = await supabase
        .from('animals_with_hunger')
        .select('*')
        .eq('id', animal.id)
        .single();

      if (!error && updatedAnimal) {
        setAnimal(updatedAnimal);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [animal?.id, loading]);

  const fetchAnimalDetails = async () => {
    setLoading(true)
    try {
      const { data: animalData, error: animalError } = await supabase
        .from('animals_with_hunger')
        .select('*')
        .eq('id', id)
        .single()

      if (animalError) throw animalError
      if (!animalData) throw new Error('Animal not found')

      setAnimal(animalData)
    } catch (error: any) {
      toast.error('Failed to load animal details')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedAnimal = async (foodId: string, recoveryAmount: number) => {
    if (!animal || feeding) return
    if (animal.hunger_level >= 100) {
      toast.error('Animal is not hungry!')
      return
    }

    setFeeding(true)
    try {
      // First delete the food item from inventory
      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', foodId)
      if (inventoryError) throw inventoryError

      // Use the server-side function to feed the animal
      const { error: feedError } = await supabase.rpc('feed_animal', {
        animal_id: animal.id,
        amount: recoveryAmount
      })
      if (feedError) throw feedError

      // Fetch the updated animal data
      const { data: updatedAnimal, error: fetchError } = await supabase
        .from('animals_with_hunger')
        .select('*')
        .eq('id', animal.id)
        .single()
      
      if (fetchError) throw fetchError
      setAnimal(updatedAnimal)
      fetchInventory()
      
      // Show different messages based on hunger level
      if (updatedAnimal.hunger_level >= 100) {
        toast.success('Your animal is fully fed!')
      } else {
        toast.success(`Fed your animal! Hunger restored by ${recoveryAmount}%`)
      }

      // Play eating animation
      setCurrentAnimation('Eating')
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
              </div>
            </div>

            {/* Hunger Level */}
            <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border ${
              (animal.hunger_level ?? 0) <= 30 ? 'border-red-500/50' : 'border-cyan-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-white">Hunger Level</h3>
                  <p className="text-sm text-gray-400">
                    Decreases by {animal.effective_hunger_rate} points per minute
                  </p>
                </div>
                <span className={`text-sm font-medium ${
                  (animal.hunger_level ?? 0) > 70 ? 'text-green-400' :
                  (animal.hunger_level ?? 0) > 30 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {animal.hunger_level ?? 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (animal.hunger_level ?? 0) > 70 ? 'bg-green-500' :
                    (animal.hunger_level ?? 0) > 30 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${animal.hunger_level ?? 0}%` }}
                />
              </div>
              {(animal.hunger_level ?? 0) <= 30 && (
                <div className="mt-3 text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {(animal.hunger_level ?? 0) <= 0 ? (
                    <span>Too hungry to race! Feed immediately!</span>
                  ) : (
                    <span>Low hunger! Feed soon to maintain racing ability.</span>
                  )}
                </div>
              )}
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
                    currentSpeed: 0,
                    currentStamina: animal.stamina,
                    lap: 0,
                    distance: 0,
                    finished: false
                  }}
                  modelUrl={animal.model_url}
                  scale={animal.model_scale}
                  rotation={animal.model_rotation}
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
                            setCurrentAnimation(animName);
                            setViewMode('model'); // Switch back to model view
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
                  <div className="p-4 border-t border-gray-700 flex justify-between items-center">
                    <button
                      onClick={() => {
                        setCurrentAnimation("");
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Stop Animation
                    </button>
                    <button
                      onClick={() => {
                        setCurrentAnimation("");
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
                        disabled={feeding || (animal.hunger_level ?? 0) >= 100}
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
