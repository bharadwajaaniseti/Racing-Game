import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import type { Animal } from '../game/types'
import type { TrainingResult, FeedingResult } from '../game/types'

interface BarnState {
  animals: Animal[]
  inventory: any[]
  loading: boolean
  error: string | null
  fetchAnimals: () => Promise<void>
  fetchInventory: () => Promise<void>
  createAnimal: (name: string) => Promise<void>
  trainAnimal: (animalId: string, stat: string) => Promise<TrainingResult>
  feedAnimal: (animalId: string) => Promise<FeedingResult>
  updateAnimalStats: (animalId: string, updates: Partial<Animal>) => Promise<void>
}

export const useBarn = create<BarnState>((set, get) => ({
  animals: [],
  inventory: [],
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

  fetchInventory: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('item_name', { ascending: true })

      if (error) throw error
      set({ inventory: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
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

      await supabase.from('inventory').upsert(starterItems, { 
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

  trainAnimal: async (animalId: string, stat: string): Promise<TrainingResult> => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // First verify the animal belongs to the user
      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .select('*')
        .eq('id', animalId)
        .eq('user_id', user.id)
        .single()

      if (animalError || !animalData) throw new Error('Animal not found or unauthorized')
      const animal = animalData

      // Check for training items
      const { data: training, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('item_type', 'training')
        .gt('quantity', 0)
        .limit(1)
        .single()

      if (invError || !training) {
        throw new Error('No training items available')
      }

      // Calculate training result
      const baseGain = Math.floor(Math.random() * 3) + 1 // 1-3 stat gain
      const experienceGain = Math.floor(Math.random() * 10) + 5 // 5-14 exp gain
      
      const currentStatValue = animal[stat as keyof Animal] as number
      const newStatValue = Math.min(100, currentStatValue + baseGain)
      const newExperience = animal.experience + experienceGain
      const newLevel = Math.floor(newExperience / 100) + 1

      // Update animal
      const { error: updateError } = await supabase
        .from('animals')
        .update({
          [stat]: newStatValue,
          experience: newExperience,
          level: newLevel
        })
        .eq('id', animalId)

      if (updateError) throw updateError

      // Update inventory
      await supabase
        .from('inventory')
        .update({ quantity: training.quantity - 1 })
        .eq('id', training.id)

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

      const message = `${animal.name} gained ${baseGain} ${stat} and ${experienceGain} experience!`
      toast.success(message)

      return {
        success: true,
        statGain: baseGain,
        experienceGain,
        message
      }
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

  feedAnimal: async (animalId: string): Promise<FeedingResult> => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // First verify the animal belongs to the user
      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .select('*')
        .eq('id', animalId)
        .eq('user_id', user.id)
        .single()

      if (animalError || !animalData) throw new Error('Animal not found or unauthorized')
      const animal = animalData

      // Check for food items
      const { data: food, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('item_type', 'food')
        .gt('quantity', 0)
        .limit(1)
        .single()

      if (invError || !food) {
        throw new Error('No food items available')
      }

      // Calculate feeding result
      const staminaGain = Math.floor(Math.random() * 10) + 5 // 5-14 stamina gain
      const newStamina = Math.min(100, animal.stamina + staminaGain)

      // Update animal
      const { error: updateError } = await supabase
        .from('animals')
        .update({ stamina: newStamina })
        .eq('id', animalId)

      if (updateError) throw updateError

      // Update inventory
      await supabase
        .from('inventory')
        .update({ quantity: food.quantity - 1 })
        .eq('id', food.id)

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

      const message = `${animal.name} gained ${staminaGain} stamina!`
      toast.success(message)

      return {
        success: true,
        staminaGain,
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