import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Loader, Check } from 'lucide-react'
import { useUser } from '../store/useUser'

export function Auth() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [step, setStep] = useState<'signin' | 'check-email' | 'create-profile'>('signin')
  const [message, setMessage] = useState('')
  const { user, profile, loading, error, signIn, createProfile } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !profile) {
      setStep('create-profile')
    } else if (user && profile) {
      navigate('/')
    }
  }, [user, profile, navigate])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    const redirectTo = `${window.location.origin}/auth`
    await signIn(email, redirectTo)
    if (!error) {
      setStep('check-email')
      setMessage('Check your email for the magic link!')
    }
  }

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    await createProfile(username)
    if (!error) {
      navigate('/')
    }
  }

  if (step === 'check-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/30 text-center">
            <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
            <p className="text-gray-300 mb-6">
              We've sent a magic link to <span className="font-medium text-cyan-400">{email}</span>. 
              Click the link in your email to sign in.
            </p>
            <button
              onClick={() => setStep('signin')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'create-profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/30">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Your Profile</h2>
            
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Choose a username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <span>Create Profile</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/30">
          <div className="text-center mb-8">
            <div className="bg-cyan-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Mail className="h-8 w-8 text-cyan-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Deer Derby</h2>
            <p className="text-gray-400">Sign in with your email to get started</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-900/50 border border-green-500/50 rounded-lg p-3">
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  <span>Send Magic Link</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            We'll send you a magic link for a password-free sign in experience.
          </p>
        </div>
      </div>
    </div>
  )
}