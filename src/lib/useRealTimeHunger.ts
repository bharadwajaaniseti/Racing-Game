import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { Animal } from '../game/types'

interface UseRealTimeHungerOptions {
  updateInterval?: number // in milliseconds, defaults to 5000 (5 seconds)
  enabled?: boolean
}

/**
 * Custom hook to provide real-time hunger level updates for animals
 * Updates every 5 seconds by default with smooth interpolation
 */
export function useRealTimeHunger(
  animals: Animal[],
  options: UseRealTimeHungerOptions = {}
) {
  const { updateInterval = 5000, enabled = true } = options
  const [hungerLevels, setHungerLevels] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  // Calculate interpolated hunger level based on time passed
  const calculateCurrentHunger = (animal: Animal): number => {
    if (!animal.last_fed || !animal.effective_hunger_rate) {
      return animal.current_hunger_level || 100
    }

    const lastFedTime = new Date(animal.last_fed).getTime()
    const now = Date.now()
    const minutesPassed = (now - lastFedTime) / (1000 * 60) // Convert to minutes
    
    // Calculate hunger decrease
    const hungerDecrease = minutesPassed * animal.effective_hunger_rate
    const currentHunger = Math.max(0, (animal.hunger_level || 100) - hungerDecrease)
    
    return Math.round(currentHunger * 10) / 10 // Round to 1 decimal place
  }

  // Update hunger levels for all animals
  const updateHungerLevels = () => {
    const newHungerLevels: Record<string, number> = {}
    
    animals.forEach(animal => {
      newHungerLevels[animal.id] = calculateCurrentHunger(animal)
    })
    
    setHungerLevels(newHungerLevels)
  }

  // Fetch fresh animal data from database
  const fetchFreshData = async () => {
    if (!enabled || animals.length === 0) return

    setLoading(true)
    try {
      const animalIds = animals.map(a => a.id)
      const { data, error } = await supabase
        .from('animals_with_hunger')
        .select('id, hunger_level, last_fed, effective_hunger_rate')
        .in('id', animalIds)

      if (error) throw error

      // Update animals data (this should trigger parent component to update)
      if (data) {
        const freshHungerLevels: Record<string, number> = {}
        data.forEach((animal: any) => {
          freshHungerLevels[animal.id] = calculateCurrentHunger(animal as Animal)
        })
        setHungerLevels(freshHungerLevels)
      }
    } catch (error) {
      console.error('Error fetching fresh hunger data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time updates
  useEffect(() => {
    if (!enabled || animals.length === 0) return

    // Initial calculation
    updateHungerLevels()

    // Set up interval for smooth updates
    const intervalId = setInterval(() => {
      updateHungerLevels()
    }, updateInterval)

    // Fetch fresh data every minute to stay in sync with database
    const fetchIntervalId = setInterval(() => {
      fetchFreshData()
    }, 60000) // 1 minute

    return () => {
      clearInterval(intervalId)
      clearInterval(fetchIntervalId)
    }
  }, [animals, updateInterval, enabled])

  // Return hunger level for a specific animal
  const getHungerLevel = (animalId: string): number => {
    return hungerLevels[animalId] ?? 100
  }

  // Get hunger status for display
  const getHungerStatus = (animalId: string) => {
    const level = getHungerLevel(animalId)
    
    if (level <= 0) return { status: 'critical', color: 'text-red-500', bgColor: 'bg-red-500' }
    if (level <= 20) return { status: 'very-low', color: 'text-red-400', bgColor: 'bg-red-500' }
    if (level <= 40) return { status: 'low', color: 'text-orange-400', bgColor: 'bg-orange-500' }
    if (level <= 70) return { status: 'medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500' }
    return { status: 'good', color: 'text-green-400', bgColor: 'bg-green-500' }
  }

  return {
    getHungerLevel,
    getHungerStatus,
    hungerLevels,
    loading,
    refresh: fetchFreshData
  }
}
