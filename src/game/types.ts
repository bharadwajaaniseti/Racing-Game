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