import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function Login() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Bring the user back to this app (localhost now, Vercel later)
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <main className="min-h-svh bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Finance Tracker</h1>
        <p className="mt-1 text-sm text-slate-600">Track your spending in RM.</p>

        {status === 'sent' ? (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            <p className="font-medium">Check your email 📬</p>
            <p className="mt-1">
              We sent a sign-in link to <strong>{email}</strong>. Open it on this device to log in.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-3 text-green-900 underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && <p className="text-sm text-red-700">{error}</p>}
          </form>
        )}
      </div>
    </main>
  )
}
