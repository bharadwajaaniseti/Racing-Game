import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useMarket } from './useMarket'
import type { MarketItem } from '../game/types'

interface InventoryItem extends MarketItem {
  quantity: number
}

interface InventoryState {
  items: { [key: string]: InventoryItem }
  loading: boolean
  error: string | null
  fetchInventory: () => Promise<void>
  useItem: (item: MarketItem) => Promise<void>
}

export const useInventory = create<InventoryState>((set, get) => ({
  items: {},
  loading: false,
  error: null,

  fetchInventory: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: inventoryItems, error } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      // Get market items to merge with inventory
      const marketItems = useMarket.getState().marketItems

      // Create inventory map with full item details
      const inventoryMap = inventoryItems.reduce((acc, invItem) => {
        const marketItem = marketItems.find(m => m.name === invItem.item_name)
        if (marketItem) {
          acc[invItem.item_name] = {
            ...marketItem,
            quantity: invItem.quantity
          }
        }
        return acc
      }, {} as { [key: string]: InventoryItem })

      set({ items: inventoryMap, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  useItem: async (item: MarketItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check cooldown
      const { checkCooldown } = useMarket.getState()
      const { onCooldown, remainingTime } = checkCooldown(item.id)
      if (onCooldown && remainingTime) {
        const minutes = Math.ceil(remainingTime / 60)
        throw new Error(`Item is on cooldown for ${minutes} minutes`)
      }

      // Apply item effects
      if (item.type === 'food') {
        // Temporary stat boost
        // TODO: Implement stat boost logic
        toast.success(`Used ${item.name}: +${item.effect_value} to stats for ${item.duration_seconds! / 60} minutes`)
      } else if (item.type === 'training') {
        // Permanent stat increase
        // TODO: Implement training logic
        toast.success(`Completed ${item.name}: Permanent +${item.effect_value} to stats`)
      } else if (item.type === 'boost') {
        // Race-specific boost
        // TODO: Implement boost logic
        toast.success(`Activated ${item.name} for next race`)
      }

      // Get current quantity
      const { data: currentInventory, error: inventoryError } = await supabase
        .from('user_inventory')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('item_name', item.name)
        .single()

      if (inventoryError) throw inventoryError

      // Update inventory
      const newQuantity = (currentInventory?.quantity || 1) - 1
      if (newQuantity <= 0) {
        const { error: deleteError } = await supabase
          .from('user_inventory')
          .delete()
          .eq('user_id', user.id)
          .eq('item_name', item.name)

        if (deleteError) throw deleteError
      } else {
        const { error: updateError } = await supabase
          .from('user_inventory')
          .update({ quantity: newQuantity })
          .eq('user_id', user.id)
          .eq('item_name', item.name)

        if (updateError) throw updateError
      }

      // Set cooldown
      if (item.cooldown_seconds) {
        const { cooldowns } = useMarket.getState()
        useMarket.setState({
          cooldowns: {
            ...cooldowns,
            [item.id]: {
              itemId: item.id,
              endsAt: Date.now() + (item.cooldown_seconds * 1000)
            }
          }
        })
      }

      // Refresh inventory
      get().fetchInventory()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }
}))
