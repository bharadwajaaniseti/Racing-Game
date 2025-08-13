import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserState {
  user: User | null
  profile: any | null
  loading: boolean
  error: string | null
  signIn: (email: string, redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: () => Promise<void>
  createProfile: (username: string) => Promise<void>
}

export const useUser = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  error: null,

  signIn: async (email: string, redirectTo?: string) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo
        }
      })
      if (error) throw error
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  signOut: async () => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, profile: null, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchProfile: async () => {
    const { user } = get()
    if (!user) return

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      set({ profile: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createProfile: async (username: string) => {
    const { user } = get()
    if (!user) throw new Error('No user found')

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ id: user.id, username }])
        .select()
        .single()

      if (error) throw error
      set({ profile: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  }
}))

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  useUser.setState({ user: session?.user || null })
  if (session?.user) {
    useUser.getState().fetchProfile()
  }
})