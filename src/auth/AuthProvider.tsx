import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'
import { clearCachedData, forgetOtherUsersData } from '../lib/pwa'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Fires on sign in (including returning from the magic link) and sign out
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setLoading(false)
      if (event === 'SIGNED_OUT') clearCachedData()
      else if (newSession) forgetOtherUsersData(newSession.user.id)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}
