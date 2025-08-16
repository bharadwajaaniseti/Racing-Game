import type { TrackSegment } from '../components/ModularTrack3D'
import type { Animal, RaceAnimal, Race } from './types'

const TRACK_SEGMENTS: TrackSegment[] = [
  { type: 'straight', length: 30, obstacles: [{ position: 15 }] },
  { type: 'curve', length: 20, angle: Math.PI / 4 },
  { type: 'straight', length: 40, obstacles: [{ position: 10 }, { position: 35 }] },
  { type: 'curve', length: 20, angle: -Math.PI / 3 },
  { type: 'straight', length: 30 },
]
const LAPS_REQUIRED = 3
const SIMULATION_TIMESTEP = 1/20 // 20Hz

export class ModularRaceSimulation {
  private race: Race
  private lastTime = 0
  private accumulator = 0
  private trackSegments = TRACK_SEGMENTS
  private totalTrackLength = TRACK_SEGMENTS.reduce((sum, seg) => sum + seg.length, 0) * LAPS_REQUIRED

  constructor(animals: Animal[]) {
    this.race = this.initializeRace(animals)
  }

  private initializeRace(animals: Animal[]): Race {
    const raceAnimals: RaceAnimal[] = animals.map((animal, index) => ({
      ...animal,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      currentSpeed: 0,
      currentStamina: animal.stamina,
      lap: 0,
      distance: 0,
      finished: false,
      jumping: false,
      jumpProgress: 0,
    }))
    return {
      id: crypto.randomUUID(),
      animals: raceAnimals,
      trackLength: this.totalTrackLength,
      status: 'racing',
      startTime: Date.now(),
      currentTime: 0
    }
  }

  public update(deltaTime: number): Race {
    this.accumulator += deltaTime
    while (this.accumulator >= SIMULATION_TIMESTEP) {
      this.fixedUpdate(SIMULATION_TIMESTEP)
      this.accumulator -= SIMULATION_TIMESTEP
    }
    this.race.currentTime = Date.now() - this.race.startTime
    // Check if race is finished
    const finishedAnimals = this.race.animals.filter(a => a.finished).length
    if (finishedAnimals === this.race.animals.length || finishedAnimals > 0) {
      this.race.status = 'completed'
      if (!this.race.winner) {
        this.race.winner = this.race.animals.find(a => a.finished)
      }
    }
    return { ...this.race }
  }

  private fixedUpdate(dt: number): void {
    this.race.animals.forEach(animal => {
      if (animal.finished) return
      this.updateAnimalPhysics(animal, dt)
      this.updateAnimalPosition(animal, dt)
      this.checkLapCompletion(animal)
      this.checkFinish(animal)
    })
  }

  private updateAnimalPhysics(animal: RaceAnimal, dt: number): void {
    // Stamina drain/regeneration
    if (animal.currentSpeed > 10) {
      animal.currentStamina = Math.max(0, animal.currentStamina - 10 * dt)
    } else {
      animal.currentStamina = Math.min(animal.stamina, animal.currentStamina + 5 * dt)
    }
    // Speed based on stamina
    const baseSpeed = animal.speed / 100
    const staminaFactor = animal.currentStamina / animal.stamina
    animal.currentSpeed = staminaFactor > 0.2 ? baseSpeed * 15 : baseSpeed * 6
    // Jump logic
    const obstacle = this.getCurrentObstacle(animal)
    if (obstacle && !animal.jumping) {
      animal.jumping = true
      animal.jumpProgress = 0
    }
    if (animal.jumping) {
      animal.jumpProgress += dt * 2
      if (animal.jumpProgress >= 1) {
        animal.jumping = false
        animal.jumpProgress = 0
      }
    }
  }

  private updateAnimalPosition(animal: RaceAnimal, dt: number): void {
    // Move along modular track
    animal.distance += animal.currentSpeed * dt
    // TODO: Calculate position (x, z) based on modular segments
    // For now, just move along x axis
    animal.position.x = animal.distance
    animal.position.y = animal.jumping ? Math.sin(Math.PI * animal.jumpProgress) * 3 : 0
    animal.position.z = 0
  }

  private getCurrentObstacle(animal: RaceAnimal) {
    // Find which segment animal is on
    let dist = animal.distance % this.totalTrackLength
    let segStart = 0
    for (const seg of this.trackSegments) {
      const segEnd = segStart + seg.length
      if (dist >= segStart && dist < segEnd) {
        if (seg.obstacles) {
          for (const obs of seg.obstacles) {
            if (dist - segStart >= obs.position && dist - segStart < obs.position + 2) {
              return obs
            }
          }
        }
        break
      }
      segStart = segEnd
    }
    return null
  }

  private checkLapCompletion(animal: RaceAnimal): void {
    const newLap = Math.floor(animal.distance / this.totalTrackLength)
    if (newLap > animal.lap) {
      animal.lap = newLap
      animal.currentStamina = Math.min(animal.stamina, animal.currentStamina + 10)
    }
  }

  private checkFinish(animal: RaceAnimal): void {
    if (animal.lap >= LAPS_REQUIRED && !animal.finished) {
      animal.finished = true
      animal.finishTime = this.race.currentTime
    }
  }

  public getRace(): Race {
    return this.race
  }

  public getLeaderboard(): RaceAnimal[] {
    return [...this.race.animals].sort((a, b) => {
      if (a.finished && !b.finished) return -1
      if (!a.finished && b.finished) return 1
      if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0)
      return b.distance - a.distance
    })
  }
}
