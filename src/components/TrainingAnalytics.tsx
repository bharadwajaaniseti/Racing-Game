import { useState, useEffect } from 'react'
import { Award, Calendar, Target, BarChart3 } from 'lucide-react'
import { useBarn } from '../store/useBarn'
import type { Animal } from '../game/types'

interface TrainingAnalyticsProps {
  animal: Animal
}

interface StatProgress {
  stat: string
  current: number
  previous: number
  sessionsCount: number
  totalGain: number
  avgGain: number
  successRate: number
}

export function TrainingAnalytics({ animal }: TrainingAnalyticsProps) {
  const { trainingHistory, fetchTrainingHistory } = useBarn()
  const [analytics, setAnalytics] = useState<StatProgress[]>([])
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week')

  useEffect(() => {
    fetchTrainingHistory(animal.id)
  }, [animal.id, fetchTrainingHistory])

  useEffect(() => {
    if (trainingHistory.length === 0) return

    const now = new Date()
    const cutoffDate = new Date()
    
    switch (timeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case 'month':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case 'all':
        cutoffDate.setFullYear(2000) // Very old date to include all
        break
    }

    const filteredSessions = trainingHistory.filter(session => 
      session.animal_id === animal.id && 
      new Date(session.training_date) >= cutoffDate
    )

    const stats = ['speed', 'acceleration', 'stamina', 'temper']
    const statAnalytics: StatProgress[] = []

    stats.forEach(stat => {
      const statSessions = filteredSessions.filter(s => s.stat_trained === stat)
      const totalGain = statSessions.reduce((sum, s) => sum + s.stat_gain, 0)
      const successfulSessions = statSessions.filter(s => s.stat_gain > 0)
      const currentValue = animal[stat as keyof Animal] as number

      statAnalytics.push({
        stat: stat.charAt(0).toUpperCase() + stat.slice(1),
        current: currentValue,
        previous: Math.max(0, currentValue - totalGain),
        sessionsCount: statSessions.length,
        totalGain,
        avgGain: statSessions.length > 0 ? totalGain / statSessions.length : 0,
        successRate: statSessions.length > 0 ? (successfulSessions.length / statSessions.length) * 100 : 0
      })
    })

    setAnalytics(statAnalytics)
  }, [trainingHistory, animal, timeRange])

  const getTotalSessions = () => trainingHistory.filter(s => s.animal_id === animal.id).length
  const getTotalExperience = () => trainingHistory
    .filter(s => s.animal_id === animal.id)
    .reduce((sum, s) => sum + s.experience_gain, 0)

  const getStatColor = (value: number) => {
    if (value >= 80) return 'text-green-400'
    if (value >= 60) return 'text-yellow-400'
    if (value >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          <span>Training Analytics</span>
        </h3>
        <div className="flex space-x-2">
          {(['week', 'month', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeRange === range
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range === 'all' ? 'All Time' : `Last ${range.charAt(0).toUpperCase() + range.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Total Sessions</span>
          </div>
          <div className="text-2xl font-bold text-white">{getTotalSessions()}</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-400 mb-2">
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">Total Experience</span>
          </div>
          <div className="text-2xl font-bold text-white">{getTotalExperience()}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <Target className="h-4 w-4" />
            <span className="text-sm font-medium">Current Level</span>
          </div>
          <div className="text-2xl font-bold text-white">{animal.level}</div>
        </div>
      </div>

      {/* Stat Progress */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white">Stat Progress</h4>
        {analytics.map((statData) => (
          <div key={statData.stat} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-white">{statData.stat}</h5>
              <div className="text-right">
                <div className={`text-lg font-bold ${getStatColor(statData.current)}`}>
                  {statData.current}/100
                </div>
                {statData.totalGain > 0 && (
                  <div className="text-sm text-green-400">
                    +{statData.totalGain} this {timeRange === 'all' ? 'total' : timeRange}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
              <div className="relative h-3 rounded-full overflow-hidden">
                {/* Previous value (darker) */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gray-600 rounded-full transition-all"
                  style={{ width: `${statData.previous}%` }}
                />
                {/* Current value (brighter) */}
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                    statData.current >= 80 ? 'bg-green-500' :
                    statData.current >= 60 ? 'bg-yellow-500' :
                    statData.current >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${statData.current}%` }}
                />
              </div>
            </div>

            {/* Training Stats */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Sessions</div>
                <div className="text-white font-medium">{statData.sessionsCount}</div>
              </div>
              <div>
                <div className="text-gray-400">Avg Gain</div>
                <div className="text-white font-medium">
                  {statData.avgGain > 0 ? `+${statData.avgGain.toFixed(1)}` : '0'}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Success Rate</div>
                <div className={`font-medium ${
                  statData.successRate >= 90 ? 'text-green-400' :
                  statData.successRate >= 70 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {statData.successRate > 0 ? `${statData.successRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {trainingHistory.filter(s => s.animal_id === animal.id).length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No training data yet</div>
          <p className="text-sm text-gray-500">Start training to see analytics and progress tracking</p>
        </div>
      )}
    </div>
  )
}
