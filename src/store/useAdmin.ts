import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Animal } from '../game/types'

interface AdminUser {
  id: string
  username: string
  email?: string
  is_admin: boolean
  created_at: string
  animal_count?: number
}

interface MarketItem {
  id: string
  type: string
  name: string
  description: string
  price: number
  effect_value: number
  created_at: string
}

interface AdminState {
  animals: Animal[]
  users: AdminUser[]
  marketItems: MarketItem[]
  loading: boolean
  error: string | null
  fetchAllAnimals: () => Promise<void>
  fetchAllUsers: () => Promise<void>
  fetchMarketItems: () => Promise<void>
  createMarketAnimal: (animal: Partial<Animal>) => Promise<void>
  updateAnimal: (animalId: string, updates: Partial<Animal>) => Promise<void>
  deleteAnimal: (animalId: string) => Promise<void>
  createMarketItem: (item: Partial<MarketItem>) => Promise<void>
}

export const useAdmin = create<AdminState>((set, get) => ({
  animals: [],
  users: [],
  marketItems: [],
  loading: false,
  error: null,

  fetchAllAnimals: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('market_animals')
        .select(`
          *,
          created_by_profile:profiles!created_by (
            username
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ animals: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchAllUsers: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          animals (count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const usersWithCount = data?.map(user => ({
        ...user,
        animal_count: user.animals?.[0]?.count || 0
      })) || []

      set({ users: usersWithCount, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchMarketItems: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('market_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ marketItems: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createMarketAnimal: async (animal: Partial<Animal>) => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('market_animals')
        .insert([{
          name: animal.name,
          type: 'deer',
          speed: animal.speed,
          acceleration: animal.acceleration,
          stamina: animal.stamina,
          temper: animal.temper,
          level: animal.level,
          price: animal.price || 100,
          created_by: user.id
        }])
        .select()
        .single()

      if (error) throw error

      const { animals } = get()
      set({ animals: [data, ...animals], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateAnimal: async (animalId: string, updates: Partial<Animal>) => {
    set({ loading: true, error: null })
    try {
      // Filter out joined fields and only keep actual market_animals columns
      const {
        created_by_profile,
        profiles,
        ...marketAnimalUpdates
      } = updates as any

      console.log('Updating animal:', animalId)
      console.log('Original updates:', updates)
      console.log('Filtered updates:', marketAnimalUpdates)

      const { data, error } = await supabase
        .from('market_animals')
        .update(marketAnimalUpdates)
        .eq('id', animalId)
        .select()

      console.log('Update result:', { data, error })

      if (error) throw error

      // Refresh the animals list to get the latest data
      const { fetchAllAnimals } = get()
      await fetchAllAnimals()
    } catch (error) {
      console.error('Update error:', error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteAnimal: async (animalId: string) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('market_animals')
        .delete()
        .eq('id', animalId)

      if (error) throw error

      const { animals } = get()
      const filteredAnimals = animals.filter(a => a.id !== animalId)
      set({ animals: filteredAnimals, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createMarketItem: async (item: Partial<MarketItem>) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('market_items')
        .insert([{
          type: item.type,
          name: item.name,
          description: item.description,
          price: item.price,
          effect_value: item.effect_value || 0
        }])
        .select()
        .single()

      if (error) throw error

      const { marketItems } = get()
      set({ marketItems: [data, ...marketItems], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  }
}))