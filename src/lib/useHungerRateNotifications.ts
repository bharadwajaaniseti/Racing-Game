import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { useUser } from '../store/useUser'
import toast from 'react-hot-toast'

interface HungerRateChange {
  animal_name: string
  old_rate: number | null
  new_rate: number | null
  changed_at: string
}

export function useHungerRateNotifications() {
  const { user } = useUser()
  const hasCheckedOfflineChanges = useRef(false)

  // Check for offline hunger rate changes when user logs in
  const checkOfflineChanges = async () => {
    if (!user || hasCheckedOfflineChanges.current) return
    
    try {
      const { data: changes, error } = await supabase.rpc('get_unnotified_hunger_changes', {
        p_user_id: user.id
      })

      if (error) throw error

      if (changes && changes.length > 0) {
        // Show summary notification
        const changeCount = changes.length
        const animalNames = [...new Set(changes.map((c: HungerRateChange) => c.animal_name))]
        
        // Show individual notifications for each change
        changes.forEach((change: HungerRateChange, index: number) => {
          const oldRate = change.old_rate?.toFixed(1) || 'default'
          const newRate = change.new_rate?.toFixed(1) || 'default'
          const timeAgo = new Date(change.changed_at).toLocaleString()
          const isIncrease = (change.new_rate || 0) > (change.old_rate || 0)
          
          setTimeout(() => {
            if (isIncrease) {
              toast.error(
                `📢 While you were away: ${change.animal_name}'s hunger rate INCREASED!\nFrom ${oldRate} to ${newRate} points/min\nChanged: ${timeAgo}`,
                { 
                  duration: 6000,
                  icon: '⚠️',
                  style: {
                    background: '#991b1b',
                    color: 'white',
                    border: '2px solid #dc2626',
                    fontSize: '13px',
                    maxWidth: '450px'
                  }
                }
              )
            } else {
              toast.success(
                `📢 While you were away: ${change.animal_name}'s hunger rate REDUCED!\nFrom ${oldRate} to ${newRate} points/min\nChanged: ${timeAgo}`,
                { 
                  duration: 5000,
                  icon: '✅',
                  style: {
                    background: '#166534',
                    color: 'white',
                    border: '2px solid #16a34a',
                    fontSize: '13px',
                    maxWidth: '450px'
                  }
                }
              )
            }
          }, index * 1500) // Stagger notifications
        })

        // Show summary notification first
        const summaryMessage = changeCount === 1 
          ? `1 hunger rate change for ${animalNames[0]}`
          : `${changeCount} hunger rate changes for ${animalNames.length} animal${animalNames.length > 1 ? 's' : ''}`

        toast(
          `🔔 Welcome back! You have ${summaryMessage} to review.`,
          { 
            duration: 8000,
            icon: '👋',
            style: {
              background: '#1e40af',
              color: 'white',
              border: '2px solid #3b82f6',
              fontSize: '14px',
              maxWidth: '400px',
              fontWeight: 'bold'
            }
          }
        )
      }
    } catch (error) {
      console.error('Error checking offline hunger rate changes:', error)
    } finally {
      hasCheckedOfflineChanges.current = true
    }
  }

  useEffect(() => {
    if (!user) {
      hasCheckedOfflineChanges.current = false
      return
    }

    // Check for offline changes when user logs in
    checkOfflineChanges()

    // Request notification permission when user logs in
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('🔔 Notifications enabled! You\'ll be alerted when admins change your animals\' settings.', {
            duration: 4000
          })
        }
      })
    }

    // Subscribe to changes in animals table for the current user
    const subscription = supabase
      .channel('hunger-rate-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'animals',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const oldRecord = payload.old as any
        const newRecord = payload.new as any
        
        // Check if hunger_rate was changed
        if (oldRecord.hunger_rate !== newRecord.hunger_rate) {
          const animalName = newRecord.name || 'Your animal'
          const oldRate = oldRecord.hunger_rate?.toFixed(1) || 'default'
          const newRate = newRecord.hunger_rate?.toFixed(1) || 'default'
          
          // Play notification sound (if supported)
          try {
            new Audio('/notification.wav').play().catch(() => {})
          } catch (e) {}
          
          if (newRecord.hunger_rate > oldRecord.hunger_rate) {
            toast.error(
              `⚠️ Admin Alert: ${animalName}'s hunger rate INCREASED!\nFrom ${oldRate} to ${newRate} points/min\nYour animal will get hungry faster!`,
              { 
                duration: 8000, 
                icon: '🚨',
                style: {
                  background: '#991b1b',
                  color: 'white',
                  border: '2px solid #dc2626',
                  fontSize: '14px',
                  maxWidth: '400px'
                }
              }
            )
          } else {
            toast.success(
              `✅ Good News: ${animalName}'s hunger rate REDUCED!\nFrom ${oldRate} to ${newRate} points/min\nYour animal will stay fed longer!`,
              { 
                duration: 6000, 
                icon: '�',
                style: {
                  background: '#166534',
                  color: 'white',
                  border: '2px solid #16a34a',
                  fontSize: '14px',
                  maxWidth: '400px'
                }
              }
            )
          }
          
          // Also show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(`Animal Racing - ${animalName}`, {
              body: `Hunger rate changed from ${oldRate} to ${newRate} points/min`,
              icon: '/favicon.ico'
            })
          }
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])
}
