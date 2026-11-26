import { useState, type FormEvent } from 'react'
import Field from './Field'
import { FormMessage } from './Feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SavingsGoal, SavingsGoalInput } from '../lib/types'

type Props = {
  initial?: SavingsGoal
  defaults?: Partial<SavingsGoalInput>
  onSubmit: (input: SavingsGoalInput) => Promise<string | undefined>
  onCancel?: () => void
}

// Positive RM amount with at most 2 decimal places
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

const parseAmount = (text: string) => {
  const clean = text.trim().replace(/,/g, '')
  return AMOUNT_PATTERN.test(clean) ? Number(clean) : null
}

export default function GoalForm({ initial, defaults, onSubmit, onCancel }: Props) {
  const start = initial ?? defaults
  const [name, setName] = useState(start?.name ?? '')
  const [target, setTarget] = useState(start?.target_amount ? start.target_amount.toFixed(2) : '')
  const [saved, setSaved] = useState(start?.current_amount ? start.current_amount.toFixed(2) : '')
  const [targetDate, setTargetDate] = useState(start?.target_date ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const targetAmount = parseAmount(target)
    const currentAmount = saved.trim() ? parseAmount(saved) : 0
    if (!name.trim()) return setError('Give the goal a name.')
    if (targetAmount === null || targetAmount <= 0) return setError('Enter a target above RM 0 with at most 2 decimals.')
    if (currentAmount === null) return setError('Enter the amount already saved, or leave it empty.')

    setBusy(true)
    const message = await onSubmit({
      name: name.trim(),
      target_amount: targetAmount,
      current_amount: currentAmount,
      target_date: targetDate || null,
    })
    setBusy(false)
    if (message) {
      setError(message)
    } else {
      setError('')
      if (!initial) {
        setName('')
        setTarget('')
        setSaved('')
        setTargetDate('')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Goal name">
        <Input
          placeholder="e.g. Raya trip, New laptop"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Target (RM)">
          <Input inputMode="decimal" placeholder="0.00" value={target} onChange={(e) => setTarget(e.target.value)} required />
        </Field>
        <Field label="Already saved (RM)">
          <Input inputMode="decimal" placeholder="0.00" value={saved} onChange={(e) => setSaved(e.target.value)} />
        </Field>
        <Field label="Target date" hint="Optional">
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
      </div>
      {error && <FormMessage>{error}</FormMessage>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create goal'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
