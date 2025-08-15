import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Package, ArrowLeft, Info as InfoIcon } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useBarn } from '../store/useBarn'
import { useRealTimeHunger } from '../lib/useRealTimeHunger'
import { HungerBar } from '../components/HungerBar'
import { ModelViewer2 as ModelViewer } from '../components/ModelViewer2'
import { supabase } from '../lib/supabase'
import type { Animal } from '../game/types'
import toast from 'react-hot-toast'

export function AnimalDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { feedAnimal } = useBarn() // Use barn store for consistent feeding
  
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [feeding, setFeeding] = useState(false)
  const [currentAnimation, setCurrentAnimation] = useState("")
  const [viewMode, setViewMode] = useState<'model' | 'animations'>('model')
  const [showInfo, setShowInfo] = useState(false)
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
  const [userInventoryItems, setUserInventoryItems] = useState<any[]>([])

  // Real-time hunger tracking for single animal
  const { getHungerLevel } = useRealTimeHunger(
    animal ? [animal] : [], 
    { updateInterval: 5000, enabled: !loading }
  )

  // Get food and other items from user_inventory
  const foodItems = userInventoryItems.filter(item => 
    item.item_name?.toLowerCase().includes('clover') || 
    item.item_name?.toLowerCase().includes('food') || 
    item.item_name?.toLowerCase().includes('carrot') ||
    item.item_name?.toLowerCase().includes('apple') ||
    item.item_name?.toLowerCase().includes('hay') ||
    item.item_name?.toLowerCase().includes('grass') ||  // Add grass for Green Grass
    item.item_name?.toLowerCase().includes('energy') || // Add energy for Energy Bar
    item.item_name?.toLowerCase().includes('boost')     // Add boost items that might be food
  )

  const otherItems = userInventoryItems.filter(item => 
    !foodItems.includes(item) // Only items not already classified as food
  )

  useEffect(() => {
    if (user && id) {
      fetchAnimalDetails()
      fetchUserInventory()
    }
  }, [user, id])

  const fetchUserInventory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', user.id)
        .gt('quantity', 0)

      if (error) throw error
      setUserInventoryItems(data || [])
    } catch (error) {
      console.error('Error fetching user inventory:', error)
    }
  }

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

  const handleFeedAnimal = async () => {
    if (!animal || feeding) return
    const currentHunger = getHungerLevel(animal.id)
    if (currentHunger >= 100) {
      toast.error('Animal is not hungry!')
      return
    }

    setFeeding(true)
    try {
      // Use the barn store's feedAnimal function for consistency
      const result = await feedAnimal(animal.id)
      
      if (result.success) {
        // Refresh animal data to get updated hunger info
        await fetchAnimalDetails()
        
        // Play eating animation
        setCurrentAnimation('Eating')
        
        // Refresh inventory to show updated food count
        fetchUserInventory()
      }
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

            {/* Hunger Level - Real-time updating */}
            <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border ${
              getHungerLevel(animal.id) <= 30 ? 'border-red-500/50' : 'border-cyan-500/30'
            }`}>
              <HungerBar
                currentLevel={getHungerLevel(animal.id)}
                hungerRate={animal.effective_hunger_rate || 1}
                size="lg"
                animated={true}
                showLabel={true}
                showRate={true}
              />
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
                        <h4 className="font-bold text-white">{item.item_name}</h4>
                        <p className="text-sm text-gray-400">Quantity: {item.quantity}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
                        Food
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-green-400">
                        {item.item_name === 'Lucky Clover' ? '+5' : 
                         item.item_name === 'Green Grass' ? '+10' : 
                         item.item_name === 'Energy Bar' ? '+10' :
                         item.item_name === 'Golden Apple' ? '+10' :
                         item.item_name === 'Speed Boost' ? '+15' :
                         item.item_name === 'Power Carrot' ? '+15' :
                         'Restores hunger'}
                      </span>
                      <button
                        onClick={() => handleFeedAnimal()}
                        disabled={feeding || getHungerLevel(animal.id) >= 100}
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
                        <h4 className="font-bold text-white">{item.item_name}</h4>
                        <p className="text-sm text-gray-400">Quantity: {item.quantity}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs capitalize text-white ${
                        item.item_name?.toLowerCase().includes('training') ? 'bg-blue-600' : 'bg-purple-600'
                      }`}>
                        {item.item_name?.toLowerCase().includes('training') ? 'Training' : 'Item'}
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
