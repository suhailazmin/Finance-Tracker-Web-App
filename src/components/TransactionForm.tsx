import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Sparkles } from 'lucide-react'
import Field from './Field'
import { FormMessage } from './Feedback'
import SegmentedControl from './SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { findRule } from '../lib/categorize'
import type { Category, CategoryRule, Transaction, TransactionInput, TransactionType } from '../lib/types'

type Props = {
  categories: Category[]
  rules?: CategoryRule[]
  initial?: Transaction
  onSubmit: (input: TransactionInput) => Promise<string | undefined>
  onCancel?: () => void
}

// Positive RM amount with at most 2 decimal places, e.g. 12, 12.5, 12.50
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

export default function TransactionForm({ categories, rules = [], initial, onSubmit, onCancel }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [date, setDate] = useState(() => initial?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? initial.amount.toFixed(2) : '')
  // null until the user picks a category themselves; until then the rules decide
  const [chosenCategoryId, setChosenCategoryId] = useState<string | null>(initial ? (initial.category_id ?? '') : null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const options = categories.filter((c) => c.type === type)

  // Auto-categorization: only use a rule whose category fits the current type
  const rule = findRule(description, rules)
  const autoCategoryId = rule && options.some((c) => c.id === rule.category_id) ? rule.category_id : ''
  const categoryId = chosenCategoryId ?? autoCategoryId
  const isAuto = chosenCategoryId === null && autoCategoryId !== ''

  function changeType(next: TransactionType) {
    setType(next)
    // a category only belongs to one type, so drop the user's pick if it no longer fits
    if (!categories.some((c) => c.id === chosenCategoryId && c.type === next)) setChosenCategoryId(null)
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
        setChosenCategoryId(null)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SegmentedControl
        label="Transaction type"
        value={type}
        onChange={changeType}
        options={[
          { value: 'expense', label: 'Expense', activeClassName: 'text-brand-orange-ink' },
          { value: 'income', label: 'Income', activeClassName: 'text-primary' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (RM)">
          <Input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>

      <Field label="Description">
        <Input
          placeholder={type === 'expense' ? 'e.g. Petronas Jalan Ampang' : 'e.g. October salary'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          required
        />
      </Field>

      <Field
        label="Category"
        hint={
          isAuto &&
          rule && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Sparkles className="size-3" aria-hidden="true" />
              Picked automatically because it contains “{rule.keyword}”
            </span>
          )
        }
      >
        <NativeSelect className="w-full" value={categoryId} onChange={(e) => setChosenCategoryId(e.target.value)}>
          <NativeSelectOption value="">Uncategorized</NativeSelectOption>
          {options.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {error && <FormMessage>{error}</FormMessage>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}
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
