import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import type { Category, Transaction, TransactionInput, TransactionType } from '../lib/types'

type Props = {
  categories: Category[]
  initial?: Transaction
  onSubmit: (input: TransactionInput) => Promise<string | undefined>
  onCancel?: () => void
}

// Positive RM amount with at most 2 decimal places, e.g. 12, 12.5, 12.50
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'

export default function TransactionForm({ categories, initial, onSubmit, onCancel }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [date, setDate] = useState(() => initial?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? initial.amount.toFixed(2) : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const options = categories.filter((c) => c.type === type)

  function changeType(next: TransactionType) {
    setType(next)
    // a category only belongs to one type, so clear it if it no longer fits
    if (!categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleanAmount = amount.trim().replace(/,/g, '')
    if (!AMOUNT_PATTERN.test(cleanAmount) || Number(cleanAmount) <= 0) {
      setError('Enter an amount above RM 0 with at most 2 decimal places.')
      return
    }
    if (!description.trim()) {
      setError('Enter a description.')
      return
    }

    setSaving(true)
    const message = await onSubmit({
      type,
      date,
      description: description.trim(),
      amount: Number(cleanAmount),
      category_id: categoryId || null,
    })
    setSaving(false)

    if (message) {
      setError(message)
    } else {
      setError('')
      if (!initial) {
        // keep date and type for quick entry of the next transaction
        setDescription('')
        setAmount('')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeType(t)}
            className={`rounded-md py-1.5 capitalize ${
              type === t
                ? `bg-white font-medium shadow-sm ${t === 'expense' ? 'text-red-700' : 'text-emerald-700'}`
                : 'text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Amount (RM)</span>
          <input
            className={`${field} mt-1`}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Date</span>
          <input
            className={`${field} mt-1`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Description</span>
        <input
          className={`${field} mt-1`}
          placeholder={type === 'expense' ? 'e.g. Petronas Jalan Ampang' : 'e.g. October salary'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          required
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Category</span>
        <select className={`${field} mt-1`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Uncategorized</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
