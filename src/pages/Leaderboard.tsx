import React, { useState, useEffect } from 'react'
import { Trophy, Medal, Award, Clock, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LeaderboardEntry {
  id: string
  user_id: string
  total_races: number
  total_wins: number
  total_podiums: number
  best_time: number | null
  points: number
  profiles?: {
    username: string
  }
}

export function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select(`
          *,
          profiles (
            username
          )
        `)
        .order('points', { ascending: false })
        .limit(50)

      if (error) throw error
      setLeaderboardData(data || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: number | null) => {
    if (!time) return 'N/A'
    const minutes = Math.floor(time / 60000)
    const seconds = Math.floor((time % 60000) / 1000)
    const milliseconds = Math.floor((time % 1000) / 10)
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-400" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-300" />
      case 3:
        return <Award className="h-6 w-6 text-orange-400" />
      default:
        return <span className="text-lg font-bold text-gray-400">{position}</span>
    }
  }

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border-yellow-500/50'
      case 2:
        return 'bg-gradient-to-r from-gray-600/20 to-gray-500/20 border-gray-400/50'
      case 3:
        return 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-orange-500/50'
      default:
        return 'bg-gray-800/50 border-gray-600/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Global Leaderboard</h1>
          <p className="text-gray-300">Top deer trainers from around the world</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Error loading leaderboard: {error}</p>
          </div>
        )}

        {leaderboardData.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">No leaderboard entries yet</p>
            <p className="text-gray-500">Be the first to compete and earn your place!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top 3 Podium */}
            {leaderboardData.length >= 3 && (
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {/* 2nd Place */}
                <div className="bg-gradient-to-r from-gray-600/20 to-gray-500/20 backdrop-blur-sm rounded-xl p-6 border border-gray-400/50 text-center order-1 md:order-1">
                  <Medal className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    {leaderboardData[1]?.profiles?.username || 'Anonymous'}
                  </h3>
                  <div className="text-2xl font-bold text-gray-300 mb-2">
                    {leaderboardData[1]?.points} pts
                  </div>
                  <div className="text-sm text-gray-400">
                    {leaderboardData[1]?.total_wins} wins / {leaderboardData[1]?.total_races} races
                  </div>
                </div>

                {/* 1st Place */}
                <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/50 text-center order-first md:order-2 md:scale-110">
                  <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {leaderboardData[0]?.profiles?.username || 'Anonymous'}
                  </h3>
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    {leaderboardData[0]?.points} pts
                  </div>
                  <div className="text-sm text-yellow-200">
                    {leaderboardData[0]?.total_wins} wins / {leaderboardData[0]?.total_races} races
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-6 border border-orange-500/50 text-center order-last md:order-3">
                  <Award className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    {leaderboardData[2]?.profiles?.username || 'Anonymous'}
                  </h3>
                  <div className="text-2xl font-bold text-orange-400 mb-2">
                    {leaderboardData[2]?.points} pts
                  </div>
                  <div className="text-sm text-orange-200">
                    {leaderboardData[2]?.total_wins} wins / {leaderboardData[2]?.total_races} races
                  </div>
                </div>
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-cyan-500/30 overflow-hidden">
              <div className="px-6 py-4 bg-gray-700/50 border-b border-gray-600">
                <h3 className="text-lg font-bold text-white">Complete Rankings</h3>
              </div>
              
              <div className="divide-y divide-gray-600">
                {leaderboardData.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`px-6 py-4 ${getPositionStyle(index + 1)} hover:bg-opacity-80 transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12">
                          {getPositionIcon(index + 1)}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{entry.profiles?.username || 'Anonymous'}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {entry.total_wins} wins, {entry.total_podiums} podiums
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-8 text-right">
                        <div>
                          <div className="font-bold text-white">{entry.points}</div>
                          <div className="text-xs text-gray-400">Points</div>
                        </div>
                        <div>
                          <div className="font-bold text-white">{entry.total_races}</div>
                          <div className="text-xs text-gray-400">Races</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-cyan-400" />
                          <div>
                            <div className="font-mono text-white">{formatTime(entry.best_time)}</div>
                            <div className="text-xs text-gray-400">Best Time</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20">
          <h3 className="text-lg font-bold text-white mb-3">Scoring System</h3>
          <div className="text-gray-300 space-y-2">
            <p><strong>Win:</strong> +100 points</p>
            <p><strong>2nd Place:</strong> +50 points</p>
            <p><strong>3rd Place:</strong> +25 points</p>
            <p><strong>Race Participation:</strong> +5 points</p>
          </div>
        </div>
      </div>
    </div>
  )
}