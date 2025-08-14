import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Plus, Edit, Trash2, Save, X, Users, Package, Coins } from 'lucide-react'
import { useUser } from '../store/useUser'
import { useAdmin } from '../store/useAdmin'
import { Animal3D } from '../components/Animal3D'
import type { Animal } from '../game/types'
import MarketAnimalForm from './admin/MarketAnimalForm'

interface EditingAnimal extends Partial<Animal> {
  id?: string
  name: string
  speed: number
  acceleration: number
  stamina: number
  temper: number
  level: number
  price?: number
}

export function Admin() {
  const { user, profile } = useUser()
  const { 
    animals, 
    users, 
    marketItems,
    loading, 
    error, 
    fetchAllAnimals, 
    fetchAllUsers,
    fetchMarketItems,
    createMarketAnimal, 
    updateAnimal, 
    deleteAnimal,
    createMarketItem
  } = useAdmin()
  
  const [activeTab, setActiveTab] = useState<'animals' | 'users' | 'market'>('animals')
  const [editingAnimal, setEditingAnimal] = useState<EditingAnimal | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [newMarketItem, setNewMarketItem] = useState({
    type: 'food',
    name: '',
    description: '',
    price: 0,
    effect_value: 0
  })

  useEffect(() => {
    if (user && profile?.is_admin) {
      fetchAllAnimals()
      fetchAllUsers()
      fetchMarketItems()
    }
  }, [user, profile, fetchAllAnimals, fetchAllUsers, fetchMarketItems])

  const handleSaveAnimal = async () => {
    if (!editingAnimal) return

    try {
      if (editingAnimal.id) {
        await updateAnimal(editingAnimal.id, editingAnimal)
      } else {
        await createMarketAnimal(editingAnimal)
      }
      setEditingAnimal(null)
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error saving animal:', error)
    }
  }

  const handleDeleteAnimal = async (animalId: string) => {
    if (confirm('Are you sure you want to delete this animal?')) {
      await deleteAnimal(animalId)
    }
  }

  const handleCreateMarketItem = async () => {
    if (!newMarketItem.name || !newMarketItem.price) return
    
    await createMarketItem(newMarketItem)
    setNewMarketItem({
      type: 'food',
      name: '',
      description: '',
      price: 0,
      effect_value: 0
    })
  }

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Access Denied</p>
          <p className="text-gray-400">You need admin privileges to access this page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('animals')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'animals'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Animals
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('market')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'market'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Coins className="h-4 w-4 inline mr-2" />
                Market
              </button>
            </div>
            <button
              onClick={() => {
                setActiveTab('market');
                setEditingAnimal({
                  name: '',
                  type: 'stag',
                  speed: 50,
                  acceleration: 50,
                  stamina: 50,
                  temper: 50,
                  level: 1,
                  price: 100
                });
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Market Animal</span>
            </button>
          </div>
        </div>

        {/* Animals Tab */}
        {activeTab === 'animals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Manage Animals</h2>
              <button
                onClick={() => setActiveTab('market')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Animal</span>
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Animals List */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-white mb-4">All Animals</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {animals.map((animal) => (
                    <div
                      key={animal.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedAnimal?.id === animal.id
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedAnimal(animal)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-white">{animal.name}</h4>
                          <p className="text-sm text-gray-400">Level {animal.level}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingAnimal(animal)
                              setShowCreateForm(true)
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteAnimal(animal.id)
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3D Preview */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-white mb-4">3D Preview</h3>
                <div className="h-80 bg-gray-900/50 rounded-lg overflow-hidden">
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
                
                {selectedAnimal && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-bold text-white">{selectedAnimal.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-300">Speed: <span className="text-cyan-400">{selectedAnimal.speed}</span></div>
                      <div className="text-gray-300">Acceleration: <span className="text-cyan-400">{selectedAnimal.acceleration}</span></div>
                      <div className="text-gray-300">Stamina: <span className="text-cyan-400">{selectedAnimal.stamina}</span></div>
                      <div className="text-gray-300">Temper: <span className="text-cyan-400">{selectedAnimal.temper}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
            <h2 className="text-2xl font-bold text-white mb-6">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="pb-3 text-gray-300">Username</th>
                    <th className="pb-3 text-gray-300">Email</th>
                    <th className="pb-3 text-gray-300">Animals</th>
                    <th className="pb-3 text-gray-300">Admin</th>
                    <th className="pb-3 text-gray-300">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-700">
                      <td className="py-3 text-white">{user.username}</td>
                      <td className="py-3 text-gray-300">{user.email || 'N/A'}</td>
                      <td className="py-3 text-gray-300">{user.animal_count || 0}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.is_admin ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
                        }`}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Market Management</h2>
              <button
                onClick={() => setEditingAnimal({ name: '', type: 'stag', speed: 50, acceleration: 50, stamina: 50, temper: 50, level: 1, price: 100 })}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Market Animal</span>
              </button>
            </div>

            {editingAnimal && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                <MarketAnimalForm 
                  initial={editingAnimal} 
                  onSave={() => {
                    setEditingAnimal(null)
                    fetchAllAnimals()
                  }}
                  onCancel={() => setEditingAnimal(null)}
                />
              </div>
            )}

            {/* Market Items List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Market Animals</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketItems.filter(item => item.type === 'animal').map((item) => (
                  <div key={item.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white">{item.name}</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingAnimal(item)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-400 font-bold">{item.price} Gold</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Market Items */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Other Market Items</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketItems.filter(item => item.type !== 'animal').map((item) => (
                  <div key={item.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white">{item.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.type === 'food' ? 'bg-green-600' :
                        item.type === 'potion' ? 'bg-purple-600' :
                        'bg-yellow-600'
                      } text-white`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-400 font-bold">{item.price} Gold</span>
                      <button className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Animal Modal */}
        {showCreateForm && editingAnimal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 border border-cyan-500/30 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  {editingAnimal.id ? 'Edit Animal' : 'Create Animal'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingAnimal(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Animal name"
                  value={editingAnimal.name}
                  onChange={(e) => setEditingAnimal({...editingAnimal, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Speed</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingAnimal.speed}
                      onChange={(e) => setEditingAnimal({...editingAnimal, speed: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Acceleration</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingAnimal.acceleration}
                      onChange={(e) => setEditingAnimal({...editingAnimal, acceleration: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Stamina</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingAnimal.stamina}
                      onChange={(e) => setEditingAnimal({...editingAnimal, stamina: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Temper</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingAnimal.temper}
                      onChange={(e) => setEditingAnimal({...editingAnimal, temper: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Level</label>
                    <input
                      type="number"
                      min="1"
                      value={editingAnimal.level}
                      onChange={(e) => setEditingAnimal({...editingAnimal, level: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Price (Gold)</label>
                    <input
                      type="number"
                      min="1"
                      value={editingAnimal.price || 100}
                      onChange={(e) => setEditingAnimal({...editingAnimal, price: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleSaveAnimal}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingAnimal(null)
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-white">Loading...</p>
            </div>
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