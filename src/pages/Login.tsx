import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import monetraLogo from '../assets/monetra-logo.png'
import { FormMessage } from '../components/Feedback'
import Field from '../components/Field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { friendlyError } from '../lib/errors'

type Mode = 'signin' | 'signup' | 'magic' | 'forgot'

const titles: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  magic: 'Email me a sign-in link',
  forgot: 'Reset password',
}

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

    if (result.error) setError(signInError(result.error.message))
    setBusy(false)
  }

  async function signInWithGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(friendlyError(error, { keepUnknown: true }))
  }

  const needsPassword = mode === 'signin' || mode === 'signup'

  return (
    <main className="app-backdrop flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="flex justify-center">
          <img
            src={monetraLogo}
            alt="Monetra – Expenses Tracker"
            width={200}
            height={204}
            className="w-50 dark:box-content dark:rounded-3xl dark:bg-brand-ivory dark:p-4"
          />
        </h1>

        <Card className="shadow-xl shadow-brand-forest/10 [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-xl font-extrabold">{titles[mode]}</CardTitle>
            <CardDescription>
              {mode === 'magic'
                ? 'We’ll email you a link that signs you in.'
                : mode === 'forgot'
                  ? 'We’ll email you a link to choose a new password.'
                  : mode === 'signup'
                    ? 'Start tracking in a minute.'
                    : 'Welcome back.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={signInWithGoogle}>
              <GoogleLogo />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              or
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>

              {needsPassword && (
                <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              )}

              <Button type="submit" size="lg" disabled={busy} className="w-full">
                {busy ? 'Please wait…' : titles[mode]}
              </Button>

              {error && <FormMessage>{error}</FormMessage>}
              {notice && (
                <Alert className="border-primary/30 bg-primary/5">
                  <MailCheck className="text-primary" />
                  <AlertDescription className="text-foreground">{notice}</AlertDescription>
                </Alert>
              )}
            </form>

            <div className="space-y-1 text-center text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// Supabase's wording for the most common case doesn't mention magic-link accounts
function signInError(message: string) {
  if (message === 'Invalid login credentials') {
    return 'Wrong email or password. If you have only used email links before, use "Forgot password?" to set a password.'
  }
  return friendlyError(message, { keepUnknown: true })
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </button>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
