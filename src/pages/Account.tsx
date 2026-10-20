import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'

const providerNames: Record<string, string> = { email: 'Email', google: 'Google' }

// Also the landing page for "Forgot password?" reset links
export default function Account() {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const user = session?.user
  const providers = user?.app_metadata.providers as string[] | undefined

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setError('')
      setSaved(true)
      setPassword('')
      setConfirm('')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 text-sm">
        <p className="text-slate-500">Signed in as</p>
        <p className="font-medium">{user?.email}</p>
        {providers && (
          <p className="mt-3 text-slate-500">
            Sign-in methods: {providers.map((p) => providerNames[p] ?? p).join(', ')}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold">Set or change password</h2>
        <p className="mt-1 text-sm text-slate-600">
          After this you can sign in with your email and password, without waiting for an email link.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 sm:max-w-sm">
          <label className="block text-sm">
            <span className="font-medium">New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} mt-1`}
            />
            <span className="mt-1 block text-xs text-slate-500">At least 8 characters.</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Confirm new password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`${field} mt-1`}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {saved && <p className="text-sm text-green-700">✅ Password saved. You can now sign in with it.</p>}
        </form>
      </section>
    </div>
  )
}
