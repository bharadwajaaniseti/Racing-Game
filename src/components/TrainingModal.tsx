import { useState, useEffect } from 'react'
import { X, Clock, TrendingUp, Award, Zap, Heart, Gauge, Brain, Star } from 'lucide-react'
import { useBarn } from '../store/useBarn'
import { useInventory } from '../store/useInventory'
import type { Animal } from '../game/types'
import toast from 'react-hot-toast'

interface TrainingModalProps {
  animal: Animal
  stat: string
  isOpen: boolean
  onClose: () => void
}

export function TrainingModal({ animal, stat, isOpen, onClose }: TrainingModalProps) {
  const { 
    trainAnimal, 
    getTrainingItemsForStat, 
    trainingCooldowns, 
    trainingHistory,
    fetchTrainingCooldowns,
    fetchTrainingHistory,
    loading 
  } = useBarn()
  const { fetchInventory } = useInventory()
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [showHistory, setShowHistory] = useState(false)

  const cooldownKey = `${animal.id}-${stat}`
  const cooldownRemaining = trainingCooldowns[cooldownKey] || 0
  const availableItems = getTrainingItemsForStat(stat)
  const animalHistory = trainingHistory.filter(session => 
    session.animal_id === animal.id && session.stat_trained === stat
  ).slice(0, 10)

  // Auto-select the first item if there's only one available and none selected
  useEffect(() => {
    if (availableItems.length === 1 && !selectedItem) {
      setSelectedItem(availableItems[0].name)
    }
  }, [availableItems, selectedItem])

  useEffect(() => {
    if (isOpen) {
      setSelectedItem('') // Reset selection when modal opens
      fetchTrainingCooldowns(animal.id)
      fetchTrainingHistory(animal.id)
      fetchInventory()
    }
  }, [isOpen, animal.id])

  const handleTrain = async () => {
    if (!selectedItem) {
      toast.error('Please select a training item')
      return
    }

    const result = await trainAnimal(animal.id, stat, selectedItem)
    if (result.success) {
      setSelectedItem('')
    }
  }

  const getStatIcon = (statName: string) => {
    switch (statName) {
      case 'speed': return <Zap className="h-5 w-5 text-blue-400" />
      case 'acceleration': return <Gauge className="h-5 w-5 text-green-400" />
      case 'stamina': return <Heart className="h-5 w-5 text-red-400" />
      case 'temper': return <Brain className="h-5 w-5 text-purple-400" />
      default: return <Star className="h-5 w-5" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 border-gray-400'
      case 'uncommon': return 'text-green-400 border-green-400'
      case 'rare': return 'text-blue-400 border-blue-400'
      case 'epic': return 'text-purple-400 border-purple-400'
      case 'legendary': return 'text-yellow-400 border-yellow-400'
      default: return 'text-gray-400 border-gray-400'
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  if (!isOpen) return null

  const currentStatValue = animal[stat as keyof Animal] as number

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {getStatIcon(stat)}
            <div>
              <h2 className="text-2xl font-bold text-white">
                Train {animal.name}'s {stat.charAt(0).toUpperCase() + stat.slice(1)}
              </h2>
              <p className="text-gray-400">Current: {currentStatValue}/100</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Cooldown Warning */}
          {cooldownRemaining > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-400">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Training Cooldown Active</span>
              </div>
              <p className="text-yellow-300 mt-1">
                You can train this stat again in {formatTime(cooldownRemaining)}
              </p>
            </div>
          )}

          {/* Current Stats */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Current Stats</h3>
              <div className="text-sm text-gray-400">Level {animal.level}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400 text-sm mb-1">Experience</div>
                <div className="text-white font-medium">{animal.experience} XP</div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(animal.experience % 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">{stat.charAt(0).toUpperCase() + stat.slice(1)}</div>
                <div className="text-white font-medium">{currentStatValue}/100</div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      currentStatValue >= 80 ? 'bg-green-500' :
                      currentStatValue >= 60 ? 'bg-yellow-500' :
                      currentStatValue >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${currentStatValue}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Available Training Items */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Available Training Items</h3>
            {availableItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">No training items available for {stat}</div>
                <p className="text-sm text-gray-500">Visit the Market to buy training items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableItems.map((item) => (
                  <div
                    key={item.item_name}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedItem === item.item_name
                        ? 'border-cyan-500 bg-cyan-900/20'
                        : `${getRarityColor(item.rarity || 'common')} bg-gray-900/30 hover:bg-gray-900/50`
                    }`}
                    onClick={() => setSelectedItem(item.item_name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{item.item_name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Qty: {item.quantity}</span>
                        <span className={`text-xs px-2 py-1 rounded ${getRarityColor(item.rarity || 'common')} bg-opacity-20`}>
                          {item.rarity || 'common'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Training History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Award className="h-4 w-4" />
            <span>View Training History ({animalHistory.length})</span>
          </button>

          {/* Training History */}
          {showHistory && (
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Recent Training Sessions</h4>
              {animalHistory.length === 0 ? (
                <p className="text-gray-400 text-sm">No training history yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {animalHistory.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {session.training_item_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          +{session.stat_gain} {session.stat_trained} • +{session.experience_gain} XP
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-green-400">
                          {session.success_rate.toFixed(1)}% success
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(session.training_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleTrain}
            disabled={loading || !selectedItem || cooldownRemaining > 0 || currentStatValue >= 100}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            <span>
              {loading ? 'Training...' : 
               currentStatValue >= 100 ? 'Stat Maxed' :
               cooldownRemaining > 0 ? 'On Cooldown' :
               'Start Training'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
