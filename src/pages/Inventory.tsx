import React, { useEffect } from 'react'
import { Heart, Zap, Star, Package, ShoppingCart, AlertTriangle, Timer } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useInventory } from '../store/useInventory'
import { useMarket } from '../store/useMarket'
import type { ItemType, MarketItem } from '../game/types'

export function Inventory() {
  const { user } = useUser()
  const { items, loading, fetchInventory, useItem } = useInventory()
  const { marketItems, checkCooldown } = useMarket()

  useEffect(() => {
    if (user) {
      fetchInventory()
    }
  }, [user, fetchInventory])

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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-600/20 text-yellow-400'
      case 'rare': return 'bg-purple-600/20 text-purple-400'
      case 'uncommon': return 'bg-blue-600/20 text-blue-400'
      default: return 'bg-gray-600/20 text-gray-400'
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds >= 3600) {
      return `${Math.floor(seconds / 3600)}h`
    }
    return `${Math.ceil(seconds / 60)}m`
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Please sign in to access your inventory</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Inventory</h1>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-white">Loading inventory...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {marketItems.filter(item => items[item.name]).map((item) => {
              const quantity = items[item.name]
              const { onCooldown, remainingTime } = checkCooldown(item.id)
              
              return (
                <div
                  key={item.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 transition-all"
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
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRarityColor(item.rarity)}`}>
                        {item.rarity}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 min-h-[2.5rem]">{item.description}</p>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-400 font-bold text-lg">Qty: {quantity}</span>
                      {item.effect_value > 0 && (
                        <span className="text-green-400 text-sm">+{item.effect_value}</span>
                      )}
                    </div>

                    <div className="border-t border-gray-700 pt-3 space-y-2">
                      {item.duration_seconds && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Duration:</span>
                          <span className="text-cyan-400">{formatTime(item.duration_seconds)}</span>
                        </div>
                      )}
                      {item.cooldown_seconds && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Cooldown:</span>
                          <span className="text-cyan-400">{formatTime(item.cooldown_seconds)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => useItem(item)}
                    disabled={onCooldown}
                    className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                  >
                    {onCooldown ? (
                      <>
                        <Timer className="h-4 w-4" />
                        <span>Ready in {formatTime(remainingTime!)}</span>
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4" />
                        <span>Use Item</span>
                      </>
                    )}
                  </button>

                  {item.max_stock && quantity >= item.max_stock && (
                    <div className="mt-2 flex items-center justify-center space-x-1 text-amber-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Max stock reached</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading && Object.keys(items).length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">Your inventory is empty</p>
            <p className="text-gray-500 mb-6">Visit the Market to purchase items!</p>
            <a
              href="/market"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all inline-flex items-center space-x-2"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Go to Market</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
