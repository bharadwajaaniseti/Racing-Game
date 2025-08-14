import { create } from 'zustand'
import { supabase } from '../lib/supabase'
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
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      set({ animals: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchInventory: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
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
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  trainAnimal: async (animalId: string, stat: string): Promise<TrainingResult> => {
    set({ loading: true, error: null })
    try {
      const { animals } = get()
      const animal = animals.find(a => a.id === animalId)
      if (!animal) throw new Error('Animal not found')

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

      // Update local state
      const updatedAnimals = animals.map(a => 
        a.id === animalId 
          ? { ...a, [stat]: newStatValue, experience: newExperience, level: newLevel }
          : a
      )
      set({ animals: updatedAnimals, loading: false })

      return {
        success: true,
        statGain: baseGain,
        experienceGain,
        message: `${animal.name} gained ${baseGain} ${stat} and ${experienceGain} experience!`
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return {
        success: false,
        statGain: 0,
        experienceGain: 0,
        message: (error as Error).message
      }
    }
  },

  feedAnimal: async (animalId: string): Promise<FeedingResult> => {
    set({ loading: true, error: null })
    try {
      const { animals } = get()
      const animal = animals.find(a => a.id === animalId)
      if (!animal) throw new Error('Animal not found')

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

      // Update local state
      const updatedAnimals = animals.map(a => 
        a.id === animalId ? { ...a, stamina: newStamina } : a
      )
      set({ animals: updatedAnimals, loading: false })

      return {
        success: true,
        staminaGain,
        message: `${animal.name} gained ${staminaGain} stamina!`
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      return {
        success: false,
        staminaGain: 0,
        message: (error as Error).message
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