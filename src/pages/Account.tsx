import { useState, type FormEvent } from 'react'
import { CircleCheck } from 'lucide-react'
import { FormMessage } from '../components/Feedback'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

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
      <PageHeader title="Account" />

      <SectionCard title="Signed in as" description={user?.email}>
        {providers && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Sign-in methods:
            {providers.map((p) => (
              <Badge key={p} variant="secondary">
                {providerNames[p] ?? p}
              </Badge>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Set or change password"
        description="After this you can sign in with your email and password, without waiting for an email link."
      >
        <form onSubmit={handleSubmit} className="space-y-4 sm:max-w-sm">
          <Field label="New password" hint="At least 8 characters.">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </Button>
          {error && <FormMessage>{error}</FormMessage>}
          {saved && (
            <FormMessage ok className="flex items-center gap-1.5">
              <CircleCheck className="size-4" aria-hidden="true" />
              Password saved. You can now sign in with it.
            </FormMessage>
          )}
        </form>
      </SectionCard>
    </div>
  )
}
