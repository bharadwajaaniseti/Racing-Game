import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useInventory } from './useInventory'
import type { Animal } from '../game/types'
import type { TrainingResult, FeedingResult } from '../game/types'

interface BarnState {
  animals: Animal[]
  trainingCooldowns: { [key: string]: number } // animalId-stat -> seconds remaining
  trainingHistory: TrainingSession[]
  loading: boolean
  error: string | null
  fetchAnimals: () => Promise<void>
  fetchTrainingCooldowns: (animalId: string) => Promise<void>
  fetchTrainingHistory: (animalId?: string) => Promise<void>
  createAnimal: (name: string) => Promise<void>
  trainAnimal: (animalId: string, stat: string, trainingItemName?: string) => Promise<EnhancedTrainingResult>
  feedAnimal: (animalId: string) => Promise<FeedingResult>
  updateAnimalStats: (animalId: string, updates: Partial<Animal>) => Promise<void>
  getTrainingItemsForStat: (stat: string) => any[]
}

interface TrainingSession {
  id: string
  animal_id: string
  training_item_name: string
  stat_trained: string
  stat_gain: number
  experience_gain: number
  training_date: string
  success_rate: number
}

interface EnhancedTrainingResult extends TrainingResult {
  successRate?: number
  cooldownSeconds?: number
  cooldownRemaining?: number
  newStatValue?: number
  newLevel?: number
  multiStat?: boolean
}

export const useBarn = create<BarnState>((set, get) => ({
  animals: [],
  trainingCooldowns: {},
  trainingHistory: [],
  loading: false,
  error: null,

  fetchAnimals: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      // Fetch from animals_with_hunger view to get real-time hunger data
      const { data, error } = await supabase
        .from('animals_with_hunger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Start real-time subscription for animal updates
      supabase
        .channel('animal_updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'animals',
          filter: `user_id=eq.${user.id}`
        }, async () => {
          // Re-fetch animals from the view to get updated hunger calculations
          const { data: updatedData, error: refreshError } = await supabase
            .from('animals_with_hunger')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
          
          if (!refreshError && updatedData) {
            set({ animals: updatedData })
            
            // Check for low hunger animals and show notifications
            updatedData.forEach((animal) => {
              const hungerLevel = animal.current_hunger_level || 100
              if (hungerLevel <= 20) {
                toast.error(`${animal.name} is very hungry! (${Math.round(hungerLevel)}% hunger)`, {
                  duration: 5000,
                  position: 'bottom-right'
                })
              }
            })
          }
        })
        .subscribe()

      // Clean up subscription when component unmounts
      // Note: This will be handled by the component using this store

      set({ animals: data || [], loading: false })
    } catch (error) {
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
    }
  },

  createAnimal: async (name: string) => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate random stats
      const stats = {
        speed: Math.floor(Math.random() * 30) + 40, // 40-70
        acceleration: Math.floor(Math.random() * 30) + 40, // 40-70
        stamina: Math.floor(Math.random() * 30) + 40, // 40-70
        temper: Math.floor(Math.random() * 60) + 20, // 20-80
      }

      const { data, error } = await supabase
        .from('animals')
        .insert([{
          user_id: user.id,
          name,
          type: 'deer',
          ...stats
        }])
        .select()
        .single()

      if (error) throw error

      // Add starter items to inventory
      const starterItems = [
        { user_id: user.id, item_type: 'food', item_name: 'Carrots', quantity: 5 },
        { user_id: user.id, item_type: 'training', item_name: 'Speed Training', quantity: 3 },
      ]

      await supabase.from('user_inventory').upsert(starterItems, { 
        onConflict: 'user_id,item_name',
        ignoreDuplicates: false
      })

      const { animals } = get()
      set({ animals: [...animals, data], loading: false })
      toast.success(`Created new deer ${name}!`)
    } catch (error) {
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
    }
  },

  trainAnimal: async (animalId: string, stat: string, trainingItemName?: string): Promise<EnhancedTrainingResult> => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // If no specific training item provided, find the best available one for the stat
      let itemName = trainingItemName
      if (!itemName) {
        const { getTrainingItemsForStat } = get()
        const availableItems = getTrainingItemsForStat(stat)
        
        if (availableItems.length === 0) {
          throw new Error(`No training items available for ${stat}! Visit the Market to buy training items.`)
        }
        
        // Use the highest rarity available item
        const sortedItems = availableItems.sort((a: any, b: any) => {
          const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }
          return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0)
        })
        itemName = sortedItems[0].name
      }

      // Call the enhanced training function
      const { data, error } = await supabase.rpc('enhanced_train_animal', {
        p_animal_id: animalId,
        p_stat_type: stat,
        p_training_item_name: itemName,
        p_user_id: user.id
      })

      if (error) throw error

      const result = data as EnhancedTrainingResult

      if (!result.success) {
        toast.error(result.message)
        if (result.cooldownRemaining) {
          // Update cooldown state
          const { trainingCooldowns } = get()
          set({ 
            trainingCooldowns: { 
              ...trainingCooldowns, 
              [`${animalId}-${stat}`]: result.cooldownRemaining 
            }
          })
        }
        set({ loading: false })
        return result
      }

      // Training succeeded - refresh animals and inventory
      const { data: refreshedAnimals } = await supabase
        .from('animals_with_hunger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      if (refreshedAnimals) {
        set({ animals: refreshedAnimals })
      }

      // Refresh inventory through useInventory store
      useInventory.getState().fetchInventory()

      // Update cooldowns
      if (result.cooldownSeconds) {
        const { trainingCooldowns } = get()
        set({ 
          trainingCooldowns: { 
            ...trainingCooldowns, 
            [`${animalId}-${stat}`]: result.cooldownSeconds 
          }
        })
        
        // Start countdown timer
        const countdownKey = `${animalId}-${stat}`
        const interval = setInterval(() => {
          const { trainingCooldowns } = get()
          const remaining = trainingCooldowns[countdownKey]
          if (remaining <= 1) {
            clearInterval(interval)
            const newCooldowns = { ...trainingCooldowns }
            delete newCooldowns[countdownKey]
            set({ trainingCooldowns: newCooldowns })
          } else {
            set({ 
              trainingCooldowns: { 
                ...trainingCooldowns, 
                [countdownKey]: remaining - 1 
              }
            })
          }
        }, 1000)
      }

      // Refresh training history
      get().fetchTrainingHistory(animalId)

      toast.success(result.message)
      set({ loading: false })
      return result
    } catch (error) {
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
      return {
        success: false,
        statGain: 0,
        experienceGain: 0,
        message
      }
    }
  },

  fetchTrainingCooldowns: async (animalId: string) => {
    try {
      const stats = ['speed', 'acceleration', 'stamina', 'temper']
      const cooldowns: { [key: string]: number } = {}
      
      for (const stat of stats) {
        const { data, error } = await supabase.rpc('get_training_cooldown', {
          p_animal_id: animalId,
          p_stat_type: stat
        })
        
        if (!error && data > 0) {
          cooldowns[`${animalId}-${stat}`] = data
        }
      }
      
      set({ trainingCooldowns: { ...get().trainingCooldowns, ...cooldowns } })
    } catch (error) {
      console.error('Error fetching training cooldowns:', error)
    }
  },

  fetchTrainingHistory: async (animalId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('training_date', { ascending: false })
        .limit(50)

      if (animalId) {
        query = query.eq('animal_id', animalId)
      }

      const { data, error } = await query

      if (error) throw error

      set({ trainingHistory: data || [] })
    } catch (error) {
      console.error('Error fetching training history:', error)
    }
  },

  getTrainingItemsForStat: (stat: string) => {
    // Get items from useInventory store
    const inventoryItems = useInventory.getState().items
    
    // Map stat types to training item patterns
    const statPatterns: { [key: string]: string[] } = {
      speed: ['Speed Training', 'Sprint Training', 'All-Around', 'Professional Training', 'Champion Training'],
      acceleration: ['Acceleration', 'Burst Training', 'All-Around', 'Professional Training', 'Champion Training'],
      stamina: ['Endurance', 'Stamina', 'Marathon Training', 'All-Around', 'Professional Training', 'Champion Training'],
      temper: ['Temperament', 'Behavior', 'Psychology Training', 'All-Around', 'Professional Training', 'Champion Training']
    }

    const patterns = statPatterns[stat] || []
    
    // Convert object to array and filter
    return Object.values(inventoryItems).filter(item => 
      item.type === 'training' && 
      item.quantity > 0 &&
      patterns.some(pattern => item.name.includes(pattern))
    )
  },

  feedAnimal: async (animalId: string): Promise<FeedingResult> => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // First verify the animal belongs to the user and get current hunger
      const { data: animalData, error: animalError } = await supabase
        .from('animals_with_hunger')
        .select('*')
        .eq('id', animalId)
        .eq('user_id', user.id)
        .single()

      if (animalError || !animalData) throw new Error('Animal not found or unauthorized')
      
      const currentHunger = animalData.current_hunger_level || 0
      if (currentHunger >= 100) {
        throw new Error('Animal is not hungry!')
      }

      // Check for food items in user_inventory - look for common food item names
      const { data: foodItems, error: invError } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .or('item_name.ilike.*food*,item_name.ilike.*clover*,item_name.ilike.*carrot*,item_name.ilike.*apple*,item_name.ilike.*hay*,item_name.ilike.*grass*,item_name.ilike.*energy*')
        .limit(1)

      if (invError || !foodItems || foodItems.length === 0) {
        throw new Error('No food items available! Visit the Market to buy food.')
      }

      const foodItem = foodItems[0]
      
      // Get the item details from market to know the effect value
      const { data: marketItemData } = await supabase
        .from('market_items')
        .select('effect_value')
        .eq('name', foodItem.item_name)
        .eq('type', 'food')
        .single()

      const hungerRecovery = marketItemData?.effect_value || 10 // Default 10 points for common food items

      // Use the feed_animal database function
      const { error: feedError } = await supabase.rpc('feed_animal', {
        animal_id: animalId,
        amount: hungerRecovery
      })

      if (feedError) throw feedError

      // Remove one food item from inventory
      if (foodItem.quantity === 1) {
        // Delete the record if this was the last item
        await supabase
          .from('user_inventory')
          .delete()
          .eq('id', foodItem.id)
      } else {
        // Decrease quantity by 1
        await supabase
          .from('user_inventory')
          .update({ quantity: foodItem.quantity - 1 })
          .eq('id', foodItem.id)
      }

      // Update local state by refreshing from animals_with_hunger view
      const { data: refreshedAnimals } = await supabase
        .from('animals_with_hunger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      if (refreshedAnimals) {
        set({ animals: refreshedAnimals, loading: false })
      } else {
        set({ loading: false })
      }

      // Calculate final hunger level for display
      const finalHunger = Math.min(100, currentHunger + hungerRecovery)
      const message = finalHunger >= 100 ? 
        `${animalData.name} is now fully fed!` :
        `Fed ${animalData.name}! Hunger restored by ${hungerRecovery} points.`

      toast.success(message)

      return {
        success: true,
        staminaGain: 0, // This is now hunger gain, but keeping interface
        message
      }
    } catch (error) {
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
      return {
        success: false,
        staminaGain: 0,
        message
      }
    }
  },

  updateAnimalStats: async (animalId: string, updates: Partial<Animal>) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('animals')
        .update(updates)
        .eq('id', animalId)

      if (error) throw error

      const { animals } = get()
      const updatedAnimals = animals.map(a => 
        a.id === animalId ? { ...a, ...updates } : a
      )
      set({ animals: updatedAnimals, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  }
}))