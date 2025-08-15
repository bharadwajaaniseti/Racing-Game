import { useState, useEffect } from 'react'
import { ShoppingCart, Coins, Package, Heart, Zap, Star, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUser } from '../store/useUser'
import { useMarket } from '../store/useMarket'
import { ModelViewer } from '../components/ModelViewer'
import { GoldPackages } from '../components/GoldPackages'
import type { Animal, ItemType, MarketItem } from '../game/types'

export function Market() {
  const { user } = useUser()
  const { 
    marketAnimals, 
    marketItems, 
    userGold, 
    loading, 
    fetchMarketAnimals, 
    fetchMarketItems, 
    fetchUserGold,
    purchaseAnimal,
    purchaseItem 
  } = useMarket()
  
  const [activeTab, setActiveTab] = useState<'animals' | 'items' | 'food' | 'gold'>('animals')
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchMarketAnimals()
      fetchMarketItems()
      fetchUserGold()
    }
  }, [user, fetchMarketAnimals, fetchMarketItems, fetchUserGold])

  const handlePurchaseAnimal = async (animal: Animal & { price?: number }, price: number) => {
    if (userGold < price) {
      alert('Not enough gold!')
      return
    }

    setPurchaseLoading(animal.id)
    try {
      await purchaseAnimal(animal.id, price)
      // Refresh market after purchase
      fetchMarketAnimals()
    } catch (error) {
      // Error is already handled by the store
    } finally {
      setPurchaseLoading(null)
    }
  }

  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const handlePurchaseItem = async (itemId: string, price: number) => {
    const quantity = quantities[itemId] || 1
    const totalPrice = price * quantity

    if (userGold < totalPrice) {
      toast.error('Not enough gold!')
      return
    }

    setPurchaseLoading(itemId)
    try {
      for (let i = 0; i < quantity; i++) {
        await purchaseItem(itemId, price)
      }
      toast.success(`Successfully purchased ${quantity} item${quantity > 1 ? 's' : ''}!`)
      setQuantities({ ...quantities, [itemId]: 1 }) // Reset quantity
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed!')
    } finally {
      setPurchaseLoading(null)
    }
  }

  const updateQuantity = (itemId: string, delta: number) => {
    const current = quantities[itemId] || 1
    const newQuantity = Math.max(1, current + delta)
    setQuantities({ ...quantities, [itemId]: newQuantity })
  }

  const getItemIcon = (type: ItemType) => {
    switch (type) {
      case 'food': return <Heart className="h-5 w-5" />
      case 'training': return <Zap className="h-5 w-5" />
      case 'boost': return <Package className="h-5 w-5" />
      case 'cosmetic': return <Star className="h-5 w-5" />
      default: return <Package className="h-5 w-5" />
    }
  }

  const getItemColor = (type: ItemType) => {
    switch (type) {
      case 'food': return 'from-green-600 to-emerald-600'
      case 'training': return 'from-blue-600 to-cyan-600'
      case 'boost': return 'from-purple-600 to-violet-600'
      case 'cosmetic': return 'from-pink-600 to-rose-600'
      default: return 'from-gray-600 to-gray-700'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Please sign in to access the market</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Market</h1>
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Coins className="h-5 w-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{userGold} Gold</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('animals')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'animals'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Star className="h-4 w-4 inline mr-2" />
                Animals
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'items'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Items
              </button>
              <button
                onClick={() => setActiveTab('food')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'food'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Heart className="h-4 w-4 inline mr-2" />
                Food
              </button>
              <button
                onClick={() => setActiveTab('gold')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'gold'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Coins className="h-4 w-4 inline mr-2" />
                Gold
              </button>
            </div>
          </div>
        </div>

        {/* Animals Tab */}
        {activeTab === 'animals' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Animals List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Premium Animal Collection</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {marketAnimals.map((animal) => (
                  <div
                    key={animal.id}
                    className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border cursor-pointer transition-all ${
                      selectedAnimal?.id === animal.id
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : 'border-cyan-500/30 hover:border-cyan-400/50'
                    }`}
                    onClick={() => {
                      setSelectedAnimal(animal)
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{animal.name}</h3>
                        <p className="text-gray-400">Level {animal.level}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold text-lg">{animal.price || 100} Gold</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-700/50 rounded-lg p-2">
                        <div className="flex items-center space-x-2 text-cyan-400">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm">Speed</span>
                        </div>
                        <div className="text-white font-bold">{animal.speed}</div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-2">
                        <div className="flex items-center space-x-2 text-green-400">
                          <Heart className="h-4 w-4" />
                          <span className="text-sm">Stamina</span>
                        </div>
                        <div className="text-white font-bold">{animal.stamina}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePurchaseAnimal(animal, animal.price || 100)
                      }}
                      disabled={purchaseLoading === animal.id || userGold < (animal.price || 100) || animal.isPurchased}
                      className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                        animal.isPurchased
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white'
                      }`}
                    >
                      {animal.isPurchased ? (
                        <span>Already Purchased</span>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>
                            {purchaseLoading === animal.id ? 'Purchasing...' : 
                             userGold < (animal.price || 100) ? 'Not Enough Gold' : 'Purchase'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {marketAnimals.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-400 mb-2">No animals available</p>
                  <p className="text-gray-500">Check back later for new arrivals!</p>
                </div>
              )}
            </div>

            {/* 3D Preview */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <h3 className="text-xl font-bold text-white mb-4">3D Preview</h3>
              <div className="h-80 mb-4">
                <ModelViewer 
                  animal={selectedAnimal ? {
                    ...selectedAnimal,
                    position: { x: 0, y: 0, z: 0 },
                    velocity: { x: 0, y: 0, z: 0 },
                    currentSpeed: 0,
                    currentStamina: selectedAnimal.stamina,
                    lap: 0,
                    distance: 0,
                    finished: false
                  } : undefined}
                  modelUrl={selectedAnimal?.model_url}
                  scale={selectedAnimal?.model_scale}
                  rotation={selectedAnimal?.model_rotation}
                  idleAnim={selectedAnimal?.idle_anim}
                  runAnim={selectedAnimal?.run_anim}
                  color="#4F46E5"
                  className="h-80"
                />
              </div>
              
              {selectedAnimal ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-lg">{selectedAnimal.name}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Speed:</span>
                      <span className="text-cyan-400 font-bold">{selectedAnimal.speed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Acceleration:</span>
                      <span className="text-cyan-400 font-bold">{selectedAnimal.acceleration}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Stamina:</span>
                      <span className="text-cyan-400 font-bold">{selectedAnimal.stamina}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Temper:</span>
                      <span className="text-cyan-400 font-bold">{selectedAnimal.temper}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Level:</span>
                      <span className="text-yellow-400 font-bold">{selectedAnimal.level}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Price:</span>
                      <span className="text-yellow-400 font-bold text-lg">{selectedAnimal.price || 100} Gold</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <p>Select an animal to preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items and Food Tabs */}
        {(activeTab === 'items' || activeTab === 'food') && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{activeTab === 'food' ? 'Food & Consumables' : 'Training & Special Items'}</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {marketItems
                .filter(item => {
                  if (activeTab === 'food') return item.type === 'food';
                  if (activeTab === 'items') return ['training', 'boost', 'cosmetic'].includes(item.type);
                  return false;
                })
                .map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${getItemColor(item.type)}`}>
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                        item.type === 'food' ? 'bg-green-600/20 text-green-400' :
                        item.type === 'training' ? 'bg-blue-600/20 text-blue-400' :
                        item.type === 'boost' ? 'bg-purple-600/20 text-purple-400' :
                        item.type === 'cosmetic' ? 'bg-pink-600/20 text-pink-400' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>
                        {item.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.rarity === 'legendary' ? 'bg-yellow-600/20 text-yellow-400' :
                        item.rarity === 'rare' ? 'bg-purple-600/20 text-purple-400' :
                        item.rarity === 'uncommon' ? 'bg-blue-600/20 text-blue-400' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>
                        {item.rarity}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 min-h-[2.5rem]">{item.description}</p>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-400 font-bold text-lg">{item.price} Gold</span>
                      {item.effect_value > 0 && (
                        <span className="text-green-400 text-sm">+{item.effect_value}</span>
                      )}
                    </div>
                    
                    <div className="border-t border-gray-700 pt-3 space-y-2">
                      {item.duration_seconds && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Duration:</span>
                          <span className="text-cyan-400">{Math.floor(item.duration_seconds / 60)} min</span>
                        </div>
                      )}
                      {item.cooldown_seconds && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Cooldown:</span>
                          <span className="text-cyan-400">
                            {item.cooldown_seconds >= 3600 
                              ? `${Math.floor(item.cooldown_seconds / 3600)}h` 
                              : `${Math.floor(item.cooldown_seconds / 60)}m`}
                          </span>
                        </div>
                      )}
                      {item.level_required > 1 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Required Level:</span>
                          <span className="text-yellow-400">{item.level_required}</span>
                        </div>
                      )}
                      {item.max_stock && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Max Stock:</span>
                          <span className="text-purple-400">{item.max_stock}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-white font-medium w-12 text-center">
                        {quantities[item.id] || 1}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white"
                        disabled={!!item.max_stock && (quantities[item.id] || 1) >= (item.max_stock || 0)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handlePurchaseItem(item.id, item.price)}
                      disabled={purchaseLoading === item.id || userGold < (item.price * (quantities[item.id] || 1))}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>
                        {purchaseLoading === item.id ? 'Purchasing...' : 
                         userGold < (item.price * (quantities[item.id] || 1)) ? 'Not Enough Gold' : 
                         `Purchase (${item.price * (quantities[item.id] || 1)} Gold)`}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {marketItems.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-400 mb-2">No items available</p>
                <p className="text-gray-500">Check back later for new items!</p>
              </div>
            )}
          </div>
        )}

        {/* Gold Packages Tab */}
        {activeTab === 'gold' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Gold Packages</h2>
            <GoldPackages marketItems={marketItems} />
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-white">Loading market...</p>
          </div>
        )}

      </div>
    </div>
  )
}