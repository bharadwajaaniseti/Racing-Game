import type { Animal, RaceAnimal, Race } from './types'

const TRACK_RADIUS = 50
const TRACK_CIRCUMFERENCE = 2 * Math.PI * TRACK_RADIUS
const LAPS_REQUIRED = 3
const SIMULATION_TIMESTEP = 1/20 // 20Hz

export class RaceSimulation {
  private race: Race
  private lastTime = 0
  private accumulator = 0

  constructor(animals: Animal[]) {
    this.race = this.initializeRace(animals)
  }

  private initializeRace(animals: Animal[]): Race {
    const raceAnimals: RaceAnimal[] = animals.map((animal, index) => ({
      ...animal,
      position: {
        x: TRACK_RADIUS * Math.cos((index * 0.5) - Math.PI/2),
        y: 0,
        z: TRACK_RADIUS * Math.sin((index * 0.5) - Math.PI/2)
      },
      velocity: { x: 0, y: 0, z: 0 },
      currentSpeed: 0,
      currentStamina: animal.stamina,
      lap: 0,
      distance: 0,
      finished: false
    }))

    return {
      id: crypto.randomUUID(),
      animals: raceAnimals,
      trackLength: TRACK_CIRCUMFERENCE * LAPS_REQUIRED,
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
    // Calculate stamina drain
    const staminaDrain = (100 - animal.stamina) * 0.001
    animal.currentStamina = Math.max(0, animal.currentStamina - staminaDrain * dt)

    // Calculate speed based on stats and stamina
    const baseSpeed = animal.speed / 100
    const accelFactor = animal.acceleration / 100
    const staminaFactor = Math.max(0.3, animal.currentStamina / animal.stamina)
    
    // Add temper-based randomness
    const temperVariance = (animal.temper / 100) * 0.2 * (Math.random() - 0.5)
    
    const targetSpeed = (baseSpeed + temperVariance) * staminaFactor * 15
    
    // Smooth acceleration/deceleration
    const speedDiff = targetSpeed - animal.currentSpeed
    animal.currentSpeed += speedDiff * accelFactor * dt * 5
    animal.currentSpeed = Math.max(0, animal.currentSpeed)
  }

  private updateAnimalPosition(animal: RaceAnimal, dt: number): void {
    // Move along circular track
    const distanceThisFrame = animal.currentSpeed * dt
    animal.distance += distanceThisFrame

    // Convert distance to angle around track
    const angle = (animal.distance / TRACK_CIRCUMFERENCE) * 2 * Math.PI - Math.PI/2
    
    // Update position
    animal.position.x = TRACK_RADIUS * Math.cos(angle)
    animal.position.z = TRACK_RADIUS * Math.sin(angle)
    
    // Calculate velocity for smooth movement
    const nextAngle = angle + (animal.currentSpeed * dt / TRACK_CIRCUMFERENCE) * 2 * Math.PI
    const nextX = TRACK_RADIUS * Math.cos(nextAngle)
    const nextZ = TRACK_RADIUS * Math.sin(nextAngle)
    
    animal.velocity.x = (nextX - animal.position.x) / dt
    animal.velocity.z = (nextZ - animal.position.z) / dt
  }

  private checkLapCompletion(animal: RaceAnimal): void {
    const newLap = Math.floor(animal.distance / TRACK_CIRCUMFERENCE)
    if (newLap > animal.lap) {
      animal.lap = newLap
      // Small stamina boost on lap completion
      animal.currentStamina = Math.min(animal.stamina, animal.currentStamina + 5)
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