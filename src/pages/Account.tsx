import { useState, type FormEvent } from 'react'
import { KeyRound, UserRound } from 'lucide-react'
import { FormMessage } from '../components/Feedback'
import AppearanceCard from '../components/AppearanceCard'
import ExportData from '../components/ExportData'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { friendlyError } from '../lib/errors'
import { toast } from 'sonner'

const providerNames: Record<string, string> = { email: 'Email', google: 'Google' }

// Also the landing page for "Forgot password?" reset links
export default function Account() {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const user = session?.user
  const providers = user?.app_metadata.providers as string[] | undefined

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(friendlyError(error, { keepUnknown: true }))
    } else {
      setError('')
      toast.success('Password saved', { description: 'You can now sign in with your email and password.' })
      setPassword('')
      setConfirm('')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Account" />

      <SectionCard title="Signed in as" description={user?.email} icon={UserRound}>
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
        icon={KeyRound}
        tone="orange"
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
        </form>
      </SectionCard>

      <AppearanceCard />

      <ExportData />
    </div>
  )
}
