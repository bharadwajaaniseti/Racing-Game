import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { supabase } from '../lib/supabase'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { ShoppingCart, Coins, Package, Heart, Zap, Star } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useMarket } from '../store/useMarket'
import { Animal3D } from '../components/Animal3D'
import type { Animal } from '../game/types'

export function Market() {
  const { user } = useUser()
  const { 
    marketAnimals, 
    marketItems, 
    userGold, 
    loading, 
    error, 
    fetchMarketAnimals, 
    fetchMarketItems, 
    fetchUserGold,
    purchaseItem 
  } = useMarket()
  
  const [activeTab, setActiveTab] = useState<'animals' | 'items'>('animals')
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
      const { error } = await supabase.rpc('buy_animal', { p_market_id: animal.id })
      if (error) throw error
      alert(`Successfully purchased ${animal.name}!`)
      // Refresh gold and market after purchase
      fetchUserGold()
      fetchMarketAnimals()
    } catch (error: any) {
      alert(error.message || 'Purchase failed!')
    } finally {
      setPurchaseLoading(null)
    }
  }

  const handlePurchaseItem = async (itemId: string, price: number) => {
    if (userGold < price) {
      alert('Not enough gold!')
      return
    }

    setPurchaseLoading(itemId)
    try {
      await purchaseItem(itemId, price)
      alert('Item purchased successfully!')
    } catch (error) {
      alert('Purchase failed!')
    } finally {
      setPurchaseLoading(null)
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'food': return <Heart className="h-5 w-5" />
      case 'potion': return <Zap className="h-5 w-5" />
      case 'currency': return <Coins className="h-5 w-5" />
      default: return <Package className="h-5 w-5" />
    }
  }

  const getItemColor = (type: string) => {
    switch (type) {
      case 'food': return 'from-green-600 to-emerald-600'
      case 'potion': return 'from-purple-600 to-violet-600'
      case 'currency': return 'from-yellow-600 to-amber-600'
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
            </div>
          </div>
        </div>

        {/* Animals Tab */}
        {activeTab === 'animals' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Animals List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Premium Deer Collection</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {marketAnimals.map((animal) => (
                  <div
                    key={animal.id}
                    className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border cursor-pointer transition-all ${
                      selectedAnimal?.id === animal.id
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : 'border-cyan-500/30 hover:border-cyan-400/50'
                    }`}
                    onClick={() => setSelectedAnimal(animal)}
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
                      disabled={purchaseLoading === animal.id || userGold < (animal.price || 100)}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>
                        {purchaseLoading === animal.id ? 'Purchasing...' : 
                         userGold < (animal.price || 100) ? 'Not Enough Gold' : 'Purchase'}
                      </span>
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
              <div className="h-80 bg-gray-900/50 rounded-lg overflow-hidden mb-4">
                <Canvas>
                  <PerspectiveCamera makeDefault position={[0, 5, 10]} />
                  <OrbitControls enablePan={false} enableZoom={true} enableRotate={true} />
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[10, 10, 5]} intensity={1} />
                  
                  {selectedAnimal && (
                    <Animal3D 
                      animal={{
                        ...selectedAnimal,
                        position: { x: 0, y: 0, z: 0 },
                        velocity: { x: 0, y: 0, z: 0 },
                        currentSpeed: 0,
                        currentStamina: selectedAnimal.stamina,
                        lap: 0,
                        distance: 0,
                        finished: false
                      }}
                      color="#4F46E5"
                    />
                  )}
                </Canvas>
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

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Market Items</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {marketItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${getItemColor(item.type)}`}>
                      {getItemIcon(item.type)}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.type === 'food' ? 'bg-green-600/20 text-green-400' :
                      item.type === 'potion' ? 'bg-purple-600/20 text-purple-400' :
                      item.type === 'currency' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {item.type}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 min-h-[2.5rem]">{item.description}</p>

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-yellow-400 font-bold text-lg">{item.price} Gold</span>
                    {item.effect_value > 0 && (
                      <span className="text-green-400 text-sm">+{item.effect_value}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handlePurchaseItem(item.id, item.price)}
                    disabled={purchaseLoading === item.id || userGold < item.price}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>
                      {purchaseLoading === item.id ? 'Purchasing...' : 
                       userGold < item.price ? 'Not Enough Gold' : 'Purchase'}
                    </span>
                  </button>
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

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-white">Loading market...</p>
          </div>
        )}

        {error && (
          <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-500/50 rounded-lg p-4 max-w-sm">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}