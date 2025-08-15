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

interface MarketAnimal {
  id: string
  name: string
  type: string
  description?: string
  price: number
  speed: number
  acceleration: number
  stamina: number
  temper: number
  level?: number
  model_url?: string
  model_scale?: number
  model_rotation?: number
  idle_anim?: string
  run_anim?: string
  thumbnail_url?: string
  is_active?: boolean
  stock?: number | null
  hunger_rate?: number
  created_by?: string
  created_at?: string
  updated_at?: string
}

interface MarketItem {
  id: string
  type: string
  name: string
  description: string
  price: number
  effect_value: number
  created_at: string
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  is_active?: boolean
  cooldown_seconds?: number
  duration_seconds?: number
}

interface AdminState {
  animals: MarketAnimal[]         // these are market_animals
  users: AdminUser[]
  marketItems: MarketItem[]
  loading: boolean
  error: string | null

  fetchAllAnimals: () => Promise<void>
  fetchAllUsers: () => Promise<void>
  fetchMarketItems: () => Promise<void>

  createMarketAnimal: (animal: Partial<MarketAnimal>) => Promise<void>
  updateAnimal: (animalId: string, updates: Partial<MarketAnimal>) => Promise<void>
  updateHungerRate: (marketAnimalId: string, hunger_rate: number) => Promise<void>
  deleteAnimal: (animalId: string) => Promise<void>
}

const MARKET_ANIMAL_COLUMNS =
  'id,name,type,description,price,speed,acceleration,stamina,temper,model_url,model_scale,model_rotation,idle_anim,run_anim,thumbnail_url,is_active,stock,hunger_rate,created_by,created_at'

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
          ${MARKET_ANIMAL_COLUMNS},
          created_by_profile:profiles!created_by ( username )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ animals: (data as MarketAnimal[]) ?? [], loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  fetchAllUsers: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, is_admin, created_at,
          animals ( count )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const usersWithCount: AdminUser[] = (data ?? []).map((u: any) => ({
        id: u.id,
        username: u.username,
        is_admin: u.is_admin,
        created_at: u.created_at,
        animal_count: u.animals?.[0]?.count || 0
      }))

      set({ users: usersWithCount, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
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
      set({ marketItems: (data as MarketItem[]) ?? [], loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  createMarketAnimal: async (animal: Partial<MarketAnimal>) => {
    set({ loading: true, error: null })
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) throw new Error('Not authenticated')

      // Only send valid columns
      const payload: Partial<MarketAnimal> = {
        name: animal.name ?? '',
        type: animal.type ?? 'unknown',
        description: animal.description ?? '',
        price: animal.price ?? 100,
        speed: animal.speed ?? 50,
        acceleration: animal.acceleration ?? 50,
        stamina: animal.stamina ?? 50,
        temper: animal.temper ?? 50,
        level: animal.level ?? 1,
        model_url: animal.model_url,
        model_scale: animal.model_scale ?? 1,
        model_rotation: animal.model_rotation ?? 0,
        idle_anim: animal.idle_anim,
        run_anim: animal.run_anim,
        thumbnail_url: animal.thumbnail_url,
        is_active: animal.is_active ?? true,
        stock: animal.stock ?? null,
        hunger_rate: animal.hunger_rate ?? 1,
        created_by: auth.user.id
      }

      const { data, error } = await supabase
        .from('market_animals')
        .insert([payload])
        .select(MARKET_ANIMAL_COLUMNS)
        .single()

      if (error) throw error

      const { animals } = get()
      set({ animals: [data as MarketAnimal, ...(animals ?? [])], loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  updateAnimal: async (animalId: string, updates: Partial<MarketAnimal>) => {
    set({ loading: true, error: null })
    try {
      // Whitelist only real columns from market_animals
      const allowedKeys: (keyof MarketAnimal)[] = [
        'name','type','description','price','speed','acceleration','stamina','temper',
        'level','model_url','model_scale','model_rotation','idle_anim','run_anim',
        'thumbnail_url','is_active','stock','hunger_rate'
      ]
      const filtered: Partial<MarketAnimal> = {}
      for (const k of allowedKeys) {
        if (k in updates && (updates as any)[k] !== undefined) {
          ;(filtered as any)[k] = (updates as any)[k]
        }
      }

      const { data, error } = await supabase
        .from('market_animals')
        .update(filtered)
        .eq('id', animalId)
        .select(MARKET_ANIMAL_COLUMNS)
        .single()

      if (error) throw error

      // Refresh list to keep state consistent
      await get().fetchAllAnimals()
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  // Helper used by ManageAnimalHunger (keeps all edits on market_animals)
  updateHungerRate: async (marketAnimalId: string, hunger_rate: number) => {
    // No global spinner; keep it snappy for inline edits
    try {
      const { error } = await supabase
        .from('market_animals')
        .update({ hunger_rate })
        .eq('id', marketAnimalId)

      if (error) throw error

      // Optional: refresh local cache
      const animals = get().animals.map(a =>
        a.id === marketAnimalId ? { ...a, hunger_rate } : a
      )
      set({ animals })
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
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
      set({ animals: (animals ?? []).filter(a => a.id !== animalId), loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  }
}))
