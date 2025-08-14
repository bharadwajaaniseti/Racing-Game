import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Animal } from '../game/types'

interface MarketAnimal extends Animal {
  price: number
  created_by: string
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

interface MarketState {
  marketAnimals: MarketAnimal[]
  marketItems: MarketItem[]
  userGold: number
  loading: boolean
  error: string | null
  fetchMarketAnimals: () => Promise<void>
  fetchMarketItems: () => Promise<void>
  fetchUserGold: () => Promise<void>
  purchaseAnimal: (animalId: string, price: number) => Promise<void>
  purchaseItem: (itemId: string, price: number) => Promise<void>
}

export const useMarket = create<MarketState>((set, get) => ({
  marketAnimals: [],
  marketItems: [],
  userGold: 1000, // Starting gold
  loading: false,
  error: null,

  fetchMarketAnimals: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('market_animals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ marketAnimals: data || [], loading: false })
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
        .order('type', { ascending: true })

      if (error) throw error
      set({ marketItems: data || [], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchUserGold: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_currency')
        .select('gold')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (!data) {
        // Create initial currency record if it doesn't exist
        const { error: insertError } = await supabase
          .from('user_currency')
          .insert([{ user_id: user.id, gold: 100 }])
        
        if (insertError) throw insertError
        set({ userGold: 100 })
      } else {
        set({ userGold: data.gold })
      }
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  purchaseAnimal: async (animalId: string, price: number) => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { userGold } = get()
      if (userGold < price) throw new Error('Insufficient gold')

      // Get the market animal
      const { data: marketAnimal, error: fetchError } = await supabase
        .from('market_animals')
        .select('*')
        .eq('id', animalId)
        .single()

      if (fetchError) throw fetchError

      // Create the animal for the user
      const { error: createError } = await supabase
        .from('animals')
        .insert([{
          user_id: user.id,
          name: marketAnimal.name,
          type: marketAnimal.type,
          speed: marketAnimal.speed,
          acceleration: marketAnimal.acceleration,
          stamina: marketAnimal.stamina,
          temper: marketAnimal.temper,
          level: marketAnimal.level,
          experience: 0
        }])

      if (createError) throw createError

      // Update user's gold
      const newGold = userGold - price
      const { error: updateError } = await supabase
        .from('user_currency')
        .update({ gold: newGold })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      set({ userGold: newGold, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  purchaseItem: async (itemId: string, price: number) => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { userGold } = get()
      if (userGold < price) throw new Error('Insufficient gold')

      // Get the market item
      const { data: marketItem, error: fetchError } = await supabase
        .from('market_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (fetchError) throw fetchError

      // Add to user's inventory
      const { error: inventoryError } = await supabase
        .from('inventory')
        .upsert([{
          user_id: user.id,
          item_type: marketItem.type,
          item_name: marketItem.name,
          quantity: 1
        }], {
          onConflict: 'user_id,item_name',
          ignoreDuplicates: false
        })

      if (inventoryError) throw inventoryError

      // Update user's gold
      const newGold = userGold - price
      const { error: updateError } = await supabase
        .from('user_currency')
        .update({ gold: newGold })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      set({ userGold: newGold, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  }
}))