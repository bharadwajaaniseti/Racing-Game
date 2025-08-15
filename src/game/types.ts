export type ItemType = 'food' | 'training' | 'boost' | 'cosmetic' | 'gold'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type EffectType = 'stat_boost' | 'race_boost' | 'cosmetic'

export interface ActiveEffect {
  id: string
  effect_type: EffectType
  effect_value: number
  expires_at: string
}

export interface MarketItem {
  id: string
  type: ItemType
  name: string
  description: string
  price: number
  effect_value: number
  duration_seconds: number | null
  cooldown_seconds: number | null
  level_required: number
  rarity: ItemRarity
  max_stock: number | null
  created_at: string
  is_active: boolean
}

export interface Animal {
  id: string
  user_id: string
  name: string
  type: string
  speed: number
  acceleration: number
  stamina: number
  temper: number
  experience: number
  level: number
  price?: number
  model_url?: string
  model_scale?: number
  model_rotation?: number
  idle_anim?: string
  run_anim?: string
  walk_anim?: string
  eat_anim?: string
  hunger_level?: number
  isPurchased?: boolean
}

export interface RaceAnimal extends Animal {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  currentSpeed: number
  currentStamina: number
  lap: number
  distance: number
  finished: boolean
  finishTime?: number
}

export interface Race {
  id: string
  animals: RaceAnimal[]
  trackLength: number
  status: 'waiting' | 'racing' | 'completed'
  startTime: number
  currentTime: number
  winner?: RaceAnimal
}

export interface RaceState {
  race: Race | null
  isRacing: boolean
  raceResults: RaceAnimal[]
}

export interface InventoryItem extends MarketItem {
  quantity: number
}

export interface TrainingResult {
  success: boolean
  statGain: number
  experienceGain: number
  message: string
}

export interface FeedingResult {
  success: boolean
  staminaGain: number
  message: string
}