import React from 'react'
import { Trophy, Gauge, Clock, Flag } from 'lucide-react'
import type { RaceAnimal, Race } from '../game/types'

interface RaceHUDProps {
  race: Race
  leaderboard: RaceAnimal[]
}

export function RaceHUD({ race, leaderboard }: RaceHUDProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
  }

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-400 bg-yellow-400/20'
      case 2: return 'text-gray-300 bg-gray-300/20'
      case 3: return 'text-orange-400 bg-orange-400/20'
      default: return 'text-white bg-gray-600/20'
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        {/* Race Info */}
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30">
          <div className="flex items-center space-x-4 text-white">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              <span className="font-mono text-lg">{formatTime(race.currentTime)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Flag className="h-5 w-5 text-green-400" />
              <span>3 Laps</span>
            </div>
            <div className="flex items-center space-x-2">
              <Gauge className="h-5 w-5 text-blue-400" />
              <span>{race.status}</span>
            </div>
          </div>
        </div>

        {/* Race Status */}
        {race.status === 'completed' && race.winner && (
          <div className="bg-green-900/90 backdrop-blur-sm rounded-lg p-4 border border-green-500/50">
            <div className="flex items-center space-x-2 text-green-400">
              <Trophy className="h-6 w-6" />
              <div>
                <div className="font-bold">{race.winner.name} Wins!</div>
                <div className="text-sm text-green-300">
                  Time: {formatTime(race.winner.finishTime || 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30 min-w-64">
        <h3 className="text-white font-bold mb-3 flex items-center">
          <Trophy className="h-4 w-4 mr-2 text-yellow-400" />
          Positions
        </h3>
        <div className="space-y-2">
          {leaderboard.map((animal, index) => (
            <div
              key={animal.id}
              className={`flex items-center justify-between p-2 rounded ${getPositionColor(index + 1)}`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-bold text-lg w-6">{index + 1}</span>
                <span className="font-medium">{animal.name}</span>
              </div>
              <div className="text-sm text-right">
                {animal.finished ? (
                  <span className="text-green-400">
                    {formatTime(animal.finishTime || 0)}
                  </span>
                ) : (
                  <span>Lap {animal.lap}/3</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom HUD - Animal Stats */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {race.animals.map((animal) => (
            <div
              key={animal.id}
              className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/30 min-w-48"
            >
              <div className="text-white text-sm">
                <div className="font-bold mb-2">{animal.name}</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Speed:</span>
                    <span className="text-cyan-400">
                      {animal.currentSpeed.toFixed(1)} m/s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stamina:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${(animal.currentStamina / animal.stamina) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-300">
                        {Math.round((animal.currentStamina / animal.stamina) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}