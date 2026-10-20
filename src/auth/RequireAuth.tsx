import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Wrap routes that need a signed-in user; everyone else goes to /login
export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return <p className="p-6 text-center text-slate-500">Loading…</p>
  }
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
