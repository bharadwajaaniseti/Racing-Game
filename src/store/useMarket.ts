import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import type { Animal } from '../game/types'

interface MarketAnimal extends Animal {
  price: number
  created_by: string
  isPurchased?: boolean
}

import type { MarketItem } from '../game/types'

interface MarketState {
  marketAnimals: MarketAnimal[]
  marketItems: MarketItem[]
  userGold: number
  loading: boolean
  error: string | null
  cooldowns: CooldownState
  fetchMarketAnimals: () => Promise<void>
  fetchMarketItems: () => Promise<void>
  fetchUserGold: () => Promise<void>
  purchaseAnimal: (animalId: string, price: number) => Promise<void>
  purchaseItem: (itemId: string, price: number) => Promise<void>
  checkCooldown: (itemId: string) => { onCooldown: boolean, remainingTime: number | null }
}

interface CooldownState {
  [key: string]: {
    itemId: string
    endsAt: number
  }
}

export const useMarket = create<MarketState>((set, get) => ({
  marketAnimals: [],
  marketItems: [],
  userGold: 1000,
  loading: false,
  error: null,
  cooldowns: {} as CooldownState,
  
  checkCooldown: (itemId: string) => {
    const { cooldowns } = get()
    const now = Date.now()
    const cooldown = cooldowns[itemId]
    
    if (!cooldown || cooldown.endsAt <= now) {
      return { onCooldown: false, remainingTime: null }
    }
    
    return { 
      onCooldown: true, 
      remainingTime: Math.ceil((cooldown.endsAt - now) / 1000)
    }
  },

  fetchMarketAnimals: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get market animals
      const { data: marketAnimals, error: marketError } = await supabase
        .from('market_animals')
        .select('*')
        .order('created_at', { ascending: false })

      if (marketError) throw marketError

      // Get user's purchased animals to check which ones they own
      const { data: userAnimals, error: userError } = await supabase
        .from('animals')
        .select('name, type')
        .eq('user_id', user.id)

      if (userError) throw userError

      // Mark animals as purchased if user owns them
      const animalsWithPurchaseStatus = marketAnimals.map(marketAnimal => ({
        ...marketAnimal,
        isPurchased: userAnimals.some(userAnimal => 
          userAnimal.name === marketAnimal.name && userAnimal.type === marketAnimal.type
        )
      }))

      set({ marketAnimals: animalsWithPurchaseStatus || [], loading: false })
    } catch (error) {
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
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
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
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

      // Call the buy_animal function to properly copy all attributes including hunger_rate
      const { error: purchaseError } = await supabase
        .rpc('buy_animal', {
          p_market_id: animalId
        })

      if (purchaseError) throw purchaseError

      // Refresh user gold after purchase (buy_animal function handles the deduction)
      await get().fetchUserGold()

      set({ loading: false })
      
      // Get the purchased animal name for the success message
      const { data: marketAnimal } = await supabase
        .from('market_animals')
        .select('name')
        .eq('id', animalId)
        .single()

      toast.success(`Successfully purchased ${marketAnimal?.name || 'animal'}!`)
    } catch (error) {
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
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

      // Check level requirement
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', user.id)
        .single()

      if ((userProfile?.level || 1) < marketItem.level_required) {
        throw new Error(`Level ${marketItem.level_required} required to purchase this item`)
      }

      // Check inventory space
      const { data: inventoryItems } = await supabase
        .from('user_inventory')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('item_name', marketItem.name)
        .single()

      if (marketItem.max_stock && (inventoryItems?.quantity || 0) >= marketItem.max_stock) {
        throw new Error(`You can only hold ${marketItem.max_stock} of this item`)
      }

      // Call the buy_item function
      const { error: purchaseError } = await supabase
        .rpc('buy_item', {
          p_item_id: itemId,
          p_user_id: user.id
        })

      if (purchaseError) throw purchaseError

      // Update user's gold
      const newGold = userGold - price
      const { error: updateError } = await supabase
        .from('user_currency')
        .update({ gold: newGold })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      set({ userGold: newGold, loading: false })
      toast.success(`Successfully purchased ${marketItem.name}!`)
    } catch (error) {
      const message = (error as Error).message
      set({ error: message, loading: false })
      toast.error(message)
      throw error
    }
  }
}))