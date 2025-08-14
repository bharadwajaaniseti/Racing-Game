import React, { useEffect, useState } from 'react'
import { Plus, Zap, Heart, Gauge, Brain, Star, Award } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useBarn } from '../store/useBarn'

export function Barn() {
  const { user } = useUser()
  const { 
    animals, 
    loading, 
    error, 
    fetchAnimals, 
    createAnimal, 
    trainAnimal, 
    feedAnimal 
  } = useBarn()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAnimalName, setNewAnimalName] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchAnimals()
    }
  }, [user, fetchAnimals])

  const handleCreateAnimal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAnimalName.trim()) return

    setActionLoading('create')
    await createAnimal(newAnimalName)
    setNewAnimalName('')
    setShowCreateForm(false)
    setActionLoading(null)
  }

  const handleTrain = async (animalId: string, stat: string) => {
    setActionLoading(animalId + '-' + stat)
    const result = await trainAnimal(animalId, stat)
    setActionMessage(result.message)
    setTimeout(() => setActionMessage(''), 3000)
    setActionLoading(null)
  }

  const handleFeed = async (animalId: string) => {
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
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Deer</span>
          </button>
        </div>

        {actionMessage && (
          <div className="mb-6 bg-blue-900/50 border border-blue-500/50 rounded-lg p-4">
            <p className="text-blue-400">{actionMessage}</p>
          </div>
        )}

        {showCreateForm && (
          <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Create New Deer</h3>
            <form onSubmit={handleCreateAnimal} className="flex gap-4">
              <input
                type="text"
                value={newAnimalName}
                onChange={(e) => setNewAnimalName(e.target.value)}
                placeholder="Enter deer name"
                className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
              <button
                type="submit"
                disabled={actionLoading === 'create'}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {actionLoading === 'create' ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>
        )}

        {loading && animals.length === 0 ? (
          <div className="text-center text-white py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p>Loading your animals...</p>
          </div>
        ) : animals.length === 0 ? (
          <div className="text-center text-white py-12">
            <p className="text-xl mb-4">You don't have any deer yet!</p>
            <p className="text-gray-400 mb-6">Create your first deer to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
            >
              Create Your First Deer
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {animals.map((animal) => (
              <div
                key={animal.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-all"
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
                          onClick={() => handleTrain(animal.id, stat.key)}
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
                    onClick={() => handleFeed(animal.id)}
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

        {error && (
          <div className="mt-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}