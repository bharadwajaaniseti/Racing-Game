import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import { useUser } from './store/useUser'
import { useHungerRateNotifications } from './lib/useHungerRateNotifications'
import { TopBarAuth } from './components/TopBarAuth'
import { Home } from './pages/Home'
import { Auth } from './pages/Auth'
import { Admin } from './pages/Admin'
import { Market } from './pages/Market'
import { Barn } from './pages/Barn'
import Race from './pages/Race'
import { Leaderboard } from './pages/Leaderboard'
import { AnimalDetails } from './pages/AnimalDetails'

function AuthHandler() {
  const [searchParams] = useSearchParams()
  const { user } = useUser()

  useEffect(() => {
    // Handle auth callback from email link
    const handleAuthCallback = async () => {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          if (error) throw error
        } catch (error) {
          console.error('Auth callback error:', error)
        }
      }
    }

    handleAuthCallback()
  }, [searchParams])

  // If user is authenticated, redirect to home
  if (user) {
    return <Navigate to="/" replace />
  }

  return <Auth />
}

function App() {
  const { user } = useUser()
  
  // Enable hunger rate notifications for authenticated users
  useHungerRateNotifications()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      useUser.setState({ user: session?.user || null })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '0.5rem',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <TopBarAuth />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthHandler />} />
          <Route 
            path="/admin" 
            element={user ? <Admin /> : <Navigate to="/auth" replace />} 
          />
          <Route path="/market" element={<Market />} />
          <Route 
            path="/barn" 
            element={user ? <Barn /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/animal/:id" 
            element={user ? <AnimalDetails /> : <Navigate to="/auth" replace />} 
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