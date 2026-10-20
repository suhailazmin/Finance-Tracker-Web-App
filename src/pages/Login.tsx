import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

type Mode = 'signin' | 'signup' | 'magic' | 'forgot'

const titles: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  magic: 'Email me a sign-in link',
  forgot: 'Reset password',
}

const field =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'

export default function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (session) return <Navigate to="/" replace />

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const address = email.trim()
    const origin = window.location.origin

    let result: { error: { message: string } | null }
    if (mode === 'signin') {
      result = await supabase.auth.signInWithPassword({ email: address, password })
    } else if (mode === 'signup') {
      result = await supabase.auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: origin },
      })
      if (!result.error) setNotice(`Check ${address} to confirm your account, then sign in.`)
    } else if (mode === 'magic') {
      result = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo: origin } })
      if (!result.error) setNotice(`We sent a sign-in link to ${address}. Open it on this device.`)
    } else {
      // The reset link signs the user in and lands on /account to choose a new password
      result = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${origin}/account` })
      if (!result.error) setNotice(`If ${address} has an account, a reset link is on its way.`)
    }

    if (result.error) setError(friendlyError(result.error.message))
    setBusy(false)
  }

  async function signInWithGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  const needsPassword = mode === 'signin' || mode === 'signup'

  return (
    <main className="min-h-svh bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Finance Tracker</h1>
        <p className="mt-1 text-sm text-slate-600">Track your spending in RM.</p>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50"
        >
          <GoogleLogo />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <h2 className="font-medium">{titles[mode]}</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${field} mt-1`}
            />
          </label>

          {needsPassword && (
            <label className="block text-sm">
              <span className="font-medium">Password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} mt-1`}
              />
              {mode === 'signup' && <span className="mt-1 block text-xs text-slate-500">At least 8 characters.</span>}
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : titles[mode]}
          </button>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {notice && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        </form>

        <div className="mt-5 space-y-1 text-sm text-slate-600">
          {mode === 'signin' ? (
            <>
              <p>
                <LinkButton onClick={() => switchMode('forgot')}>Forgot password?</LinkButton> ·{' '}
                <LinkButton onClick={() => switchMode('magic')}>Email me a link instead</LinkButton>
              </p>
              <p>
                No account yet? <LinkButton onClick={() => switchMode('signup')}>Create one</LinkButton>
              </p>
            </>
          ) : (
            <p>
              <LinkButton onClick={() => switchMode('signin')}>← Back to sign in with password</LinkButton>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

// Supabase's wording for the most common case doesn't mention magic-link accounts
function friendlyError(message: string) {
  if (message === 'Invalid login credentials') {
    return 'Wrong email or password. If you have only used email links before, use "Forgot password?" to set a password.'
  }
  return message
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-emerald-700 hover:underline">
      {children}
    </button>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
