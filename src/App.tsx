import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useUser } from './store/useUser'
import { TopBarAuth } from './components/TopBarAuth'
import { Home } from './pages/Home'
import { Auth } from './pages/Auth'
import { Garage } from './pages/Garage'
import { Race } from './pages/Race'
import { Leaderboard } from './pages/Leaderboard'

function App() {
  const { user } = useUser()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      useUser.setState({ user: session?.user || null })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        useUser.setState({ user: session?.user || null })
        if (session?.user && !useUser.getState().profile) {
          useUser.getState().fetchProfile()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <TopBarAuth />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/garage" 
            element={user ? <Garage /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/race" 
            element={user ? <Race /> : <Navigate to="/auth" replace />} 
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App