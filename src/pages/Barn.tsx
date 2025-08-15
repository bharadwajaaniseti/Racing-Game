import { useEffect, useState } from 'react'
import { Zap, Heart, Gauge, Brain, Star, Award, ShoppingCart, Package } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useBarn } from '../store/useBarn'
import { useInventory } from '../store/useInventory'
import { useMarket } from '../store/useMarket'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { ItemType, MarketItem } from '../game/types'

// Changed to named export and removed default
export function Barn() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { 
    animals, 
    loading, 
    error, 
    fetchAnimals, 
    trainAnimal, 
    feedAnimal 
  } = useBarn()
  const { items, loading: inventoryLoading, fetchInventory } = useInventory()
  const { fetchMarketItems } = useMarket()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'animals' | 'items' | 'food'>('animals')

  useEffect(() => {
    if (user) {
      fetchAnimals()
      fetchInventory()
      fetchMarketItems()
    }
  }, [user, fetchAnimals, fetchInventory, fetchMarketItems])

  const handleTrain = async (animalId: string, stat: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActionLoading(animalId + '-' + stat)
    const result = await trainAnimal(animalId, stat)
    setActionMessage(result.message)
    setTimeout(() => setActionMessage(''), 3000)
    setActionLoading(null)
  }

  const handleFeed = async (animalId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActionLoading(animalId + '-feed')
    const result = await feedAnimal(animalId)
    setActionMessage(result.message)
    setTimeout(() => setActionMessage(''), 3000)
    setActionLoading(null)
  }

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'speed': return <Zap className="h-4 w-4" />
      case 'acceleration': return <Gauge className="h-4 w-4" />
      case 'stamina': return <Heart className="h-4 w-4" />
      case 'temper': return <Brain className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const getStatColor = (value: number) => {
    if (value >= 80) return 'text-green-400'
    if (value >= 60) return 'text-yellow-400'
    if (value >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Please sign in to access your barn</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Your Barn</h1>
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
          </div>
        </div>

        {actionMessage && (
          <div className="mb-6 bg-blue-900/50 border border-blue-500/50 rounded-lg p-4">
            <p className="text-blue-400">{actionMessage}</p>
          </div>
        )}

        {/* Animals Tab */}
        {activeTab === 'animals' ? (
          <>
            {loading && animals.length === 0 ? (
              <div className="text-center text-white py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p>Loading your animals...</p>
              </div>
            ) : animals.length === 0 ? (
              <div className="text-center text-white py-12">
                <p className="text-xl mb-4">You don't have any deer yet!</p>
                <p className="text-gray-400 mb-6">Visit the Market to purchase your first deer.</p>
                <Link
                  to="/market"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all inline-flex items-center space-x-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Go to Market</span>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {animals.map((animal) => (
                  <div
                    key={animal.id}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/animal/${animal.id}`)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">{animal.name}</h3>
                      <div className="flex items-center space-x-2 text-yellow-400">
                        <Award className="h-4 w-4" />
                        <span className="text-sm">Level {animal.level}</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="text-sm text-gray-400 mb-2">Experience: {animal.experience}/100</div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(animal.experience % 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {[
                        { key: 'speed', label: 'Speed', value: animal.speed },
                        { key: 'acceleration', label: 'Acceleration', value: animal.acceleration },
                        { key: 'stamina', label: 'Stamina', value: animal.stamina },
                        { key: 'temper', label: 'Temper', value: animal.temper },
                      ].map((stat) => (
                        <div key={stat.key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-gray-300">
                            {getStatIcon(stat.key)}
                            <span className="capitalize">{stat.label}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-20 bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  stat.value >= 80 ? 'bg-green-500' :
                                  stat.value >= 60 ? 'bg-yellow-500' :
                                  stat.value >= 40 ? 'bg-orange-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${stat.value}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium w-8 ${getStatColor(stat.value)}`}>
                              {stat.value}
                            </span>
                            <button
                              onClick={(e) => handleTrain(animal.id, stat.key, e)}
                              disabled={actionLoading === `${animal.id}-${stat.key}`}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
                            >
                              {actionLoading === `${animal.id}-${stat.key}` ? '...' : 'Train'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleFeed(animal.id, e)}
                        disabled={actionLoading === `${animal.id}-feed`}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                      >
                        <Heart className="h-4 w-4" />
                        <span>{actionLoading === `${animal.id}-feed` ? 'Feeding...' : 'Feed'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Items and Food Tabs */
          <>
            {inventoryLoading ? (
              <div className="text-center text-white py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p>Loading your inventory...</p>
              </div>
            ) : Object.entries(items).filter(([name]) => {
                const itemDetails = useMarket.getState().marketItems.find((item: MarketItem) => item.name === name)
                return activeTab === 'food' ? itemDetails?.type === 'food' : itemDetails?.type !== 'food'
              }).length === 0 ? (
              <div className="text-center text-white py-12">
                <p className="text-xl mb-4">Your {activeTab} inventory is empty!</p>
                <p className="text-gray-400 mb-6">Visit the Market to purchase {activeTab}.</p>
                <Link
                  to="/market"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all inline-flex items-center space-x-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Go to Market</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {Object.entries(items)
                  .filter(([itemName]) => {
                    const itemDetails = useMarket.getState().marketItems.find((item: MarketItem) => item.name === itemName)
                    return activeTab === 'food' ? itemDetails?.type === 'food' : itemDetails?.type !== 'food'
                  })
                  .map(([itemName, quantity]) => {
                    const itemDetails = useMarket.getState().marketItems.find((item: MarketItem) => item.name === itemName)
                    if (!itemDetails) return null

                    const getItemIcon = (type: ItemType) => {
                      switch (type) {
                        case 'food':
                          return <Heart className="h-5 w-5 text-green-400" />
                        case 'training':
                          return <Gauge className="h-5 w-5 text-blue-400" />
                        case 'boost':
                          return <Zap className="h-5 w-5 text-yellow-400" />
                        case 'cosmetic':
                          return <Star className="h-5 w-5 text-purple-400" />
                        default:
                          return <Package className="h-5 w-5 text-cyan-400" />
                      }
                    }

                    const getItemDescription = (item: MarketItem) => {
                      const effectValue = item.effect_value > 0 ? `+${item.effect_value}` : item.effect_value
                      switch (item.type) {
                        case 'food':
                          return `Temporarily boosts your deer's stats by ${effectValue} for ${item.duration_seconds! / 60} minutes.`
                        case 'training':
                          return `Permanently increases your deer's stats by ${effectValue}.`
                        case 'boost':
                          return `Provides a ${effectValue} boost during your next race. Effect lasts ${item.duration_seconds! / 60} minutes.`
                        case 'cosmetic':
                          return `A special cosmetic item that adds style to your deer.`
                        default:
                          return item.description
                      }
                    }

                    const getBgColor = (type: ItemType) => {
                      switch (type) {
                        case 'food':
                          return 'bg-green-500/20'
                        case 'training':
                          return 'bg-blue-500/20'
                        case 'boost':
                          return 'bg-yellow-500/20'
                        case 'cosmetic':
                          return 'bg-purple-500/20'
                        default:
                          return 'bg-cyan-500/20'
                      }
                    }

                    return (
                      <div
                        key={itemName}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-cyan-500/30 hover:border-cyan-400/50 transition-all overflow-hidden"
                      >
                        <div className="p-6 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`${getBgColor(itemDetails.type)} p-2 rounded-lg`}>
                                {getItemIcon(itemDetails.type)}
                              </div>
                              <h3 className="text-lg font-bold text-white">{itemDetails.name}</h3>
                              <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-bold">
                                {quantity} in stock
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                itemDetails.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                                itemDetails.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                                itemDetails.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                                itemDetails.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {itemDetails.rarity}
                              </span>
                            </div>
                            
                            <div className="text-gray-400 text-sm mb-4">
                              {getItemDescription(itemDetails)}
                              {itemDetails.cooldown_seconds && (
                                <div className="mt-1 text-blue-400">
                                  Cooldown: {itemDetails.cooldown_seconds / 60} minutes
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => toast.success('Coming soon!')}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                              >
                                {getItemIcon(itemDetails.type)}
                                <span>Use Item</span>
                              </button>
                              
                              <button
                                onClick={() => toast.success('Coming soon!')}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                              >
                                <Award className="h-4 w-4" />
                                <span>View Details</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
