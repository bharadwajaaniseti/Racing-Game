import React from 'react'
import { Link } from 'react-router-dom'
import { Car, Trophy, User, Zap } from 'lucide-react'
import { useUser } from '../store/useUser'

export function Home() {
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Animal Racing
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Train your deer, compete in thrilling 3D races, and climb the leaderboards in the most exciting racing simulation ever created.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <>
                  <Link
                    to="/garage"
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center space-x-2"
                  >
                    <User className="h-6 w-6" />
                    <span>Go to Garage</span>
                  </Link>
                  <Link
                    to="/race"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center space-x-2"
                  >
                    <Car className="h-6 w-6" />
                    <span>Join Race</span>
                  </Link>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center space-x-2"
                >
                  <Zap className="h-6 w-6" />
                  <span>Get Started</span>
                </Link>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors">
              <div className="text-cyan-400 mb-4">
                <User className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Train Your Deer</h3>
              <p className="text-gray-300">
                Customize and train your deer with unique stats. Feed them, improve their speed, acceleration, stamina, and temperament to create the ultimate racing champion.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors">
              <div className="text-green-400 mb-4">
                <Car className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3D Racing</h3>
              <p className="text-gray-300">
                Experience thrilling 3D races on procedurally generated oval tracks. Watch real-time physics simulation as your deer compete against AI opponents.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-400/50 transition-colors">
              <div className="text-yellow-400 mb-4">
                <Trophy className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Compete & Win</h3>
              <p className="text-gray-300">
                Climb the global leaderboards, earn points, and prove you're the best deer trainer in the world. Track your wins, podiums, and best times.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          {user && (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/20">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Quick Actions</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/garage"
                  className="flex items-center space-x-3 bg-gray-700/50 hover:bg-gray-700/70 rounded-lg p-4 transition-colors text-white"
                >
                  <User className="h-6 w-6 text-cyan-400" />
                  <div>
                    <div className="font-medium">Manage Animals</div>
                    <div className="text-sm text-gray-400">Train and feed your deer</div>
                  </div>
                </Link>
                <Link
                  to="/leaderboard"
                  className="flex items-center space-x-3 bg-gray-700/50 hover:bg-gray-700/70 rounded-lg p-4 transition-colors text-white"
                >
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  <div>
                    <div className="font-medium">View Rankings</div>
                    <div className="text-sm text-gray-400">Check the leaderboard</div>
                  </div>
                </Link>
                <Link
                  to="/race"
                  className="flex items-center space-x-3 bg-gray-700/50 hover:bg-gray-700/70 rounded-lg p-4 transition-colors text-white"
                >
                  <Car className="h-6 w-6 text-green-400" />
                  <div>
                    <div className="font-medium">Start Racing</div>
                    <div className="text-sm text-gray-400">Join a race now</div>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute top-40 right-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-1000" />
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-2000" />
        </div>
      </div>
    </div>
  )
}