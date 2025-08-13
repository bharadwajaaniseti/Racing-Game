import React from 'react'
import { Link } from 'react-router-dom'
import { User, Trophy, Car, Home } from 'lucide-react'
import { useUser } from '../store/useUser'

export function TopBarAuth() {
  const { user, profile, signOut } = useUser()

  return (
    <header className="bg-gray-900 text-white shadow-lg border-b border-cyan-500/30">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:text-cyan-400 transition-colors">
            <Car className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Deer Derby
            </h1>
          </Link>

          <nav className="flex items-center space-x-6">
            <Link 
              to="/" 
              className="flex items-center space-x-1 hover:text-cyan-400 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            {user && (
              <>
                <Link 
                  to="/garage" 
                  className="flex items-center space-x-1 hover:text-cyan-400 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Garage</span>
                </Link>
                <Link 
                  to="/leaderboard" 
                  className="flex items-center space-x-1 hover:text-cyan-400 transition-colors"
                >
                  <Trophy className="h-4 w-4" />
                  <span>Leaderboard</span>
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-300">
                  Welcome, {profile?.username || 'User'}
                </span>
                <button
                  onClick={signOut}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}