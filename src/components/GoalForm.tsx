import { useState, type FormEvent } from 'react'
import type { SavingsGoal, SavingsGoalInput } from '../lib/types'

type Props = {
  initial?: SavingsGoal
  defaults?: Partial<SavingsGoalInput>
  onSubmit: (input: SavingsGoalInput) => Promise<string | undefined>
  onCancel?: () => void
}

// Positive RM amount with at most 2 decimal places
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="font-medium">Goal name</span>
        <input
          className={`${field} mt-1`}
          placeholder="e.g. Raya trip, New laptop"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium">Target (RM)</span>
          <input
            className={`${field} mt-1`}
            inputMode="decimal"
            placeholder="0.00"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Already saved (RM)</span>
          <input
            className={`${field} mt-1`}
            inputMode="decimal"
            placeholder="0.00"
            value={saved}
            onChange={(e) => setSaved(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Target date</span>
          <input className={`${field} mt-1`} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <span className="mt-1 block text-xs text-slate-500">Optional</span>
        </label>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create goal'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
