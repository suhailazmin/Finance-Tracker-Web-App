import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { BellRing } from 'lucide-react'
import CategoryIcon from './CategoryIcon'
import { FormMessage } from './Feedback'
import SectionCard from './SectionCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRecurring } from '../hooks/useRecurring'
import { formatRM } from '../lib/format'
import { useAmountsHidden } from '../lib/privacy'
import { dueOccurrences, type Due } from '../lib/recurring'
import { refreshAll } from '../lib/refresh'
import type { Category, RecurringTransaction } from '../lib/types'

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

// Dashboard card for "ask me first" recurring items that have come due
export default function DueRecurring({ categories }: { categories: Category[] }) {
  const { items, missingTable, post, skip } = useRecurring()
  if (missingTable) return null

  // one month at a time per item, oldest first
  const due = items
    .filter((i) => i.active && !i.auto_add)
    .map((item) => ({ item, due: dueOccurrences(item)[0] }))
    .filter((d): d is { item: RecurringTransaction; due: Due } => Boolean(d.due))
    .sort((a, b) => a.due.date.getTime() - b.due.date.getTime())
  if (due.length === 0) return null

  return (
    <SectionCard
      title="Due to confirm"
      description="Recurring items set to ask first"
      icon={BellRing}
      tone="orange"
      actions={
        <Button asChild variant="ghost" size="sm" className="font-bold text-primary hover:text-primary">
          <Link to="/recurring">Manage</Link>
        </Button>
      }
      contentClassName="px-0"
    >
      <ul className="divide-y divide-border/70">
        {due.map(({ item, due }) => (
          <DueRow
            key={item.id}
            item={item}
            due={due}
            category={categories.find((c) => c.id === item.category_id)}
            onAdd={async (amount) => {
              const error = await post(item, due.month, due.date, amount)
              if (!error) await refreshAll() // update the dashboard totals
              return error
            }}
            onSkip={() => skip(item, due.month)}
          />
        ))}
      </ul>
    </SectionCard>
  )
}

type RowProps = {
  item: RecurringTransaction
  due: Due
  category?: Category
  onAdd: (amount: number) => Promise<string | undefined>
  onSkip: () => Promise<string | undefined>
}

function DueRow({ item, due, category, onAdd, onSkip }: RowProps) {
  const hidden = useAmountsHidden()
  const [amount, setAmount] = useState(item.amount.toFixed(2))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<string | undefined>) {
    setBusy(true)
    setError('')
    const message = await action()
    setBusy(false)
    if (message) setError(message)
  }

  function add() {
    const clean = amount.trim().replace(/,/g, '')
    if (!AMOUNT_PATTERN.test(clean) || Number(clean) <= 0) return setError('Enter an amount above RM 0.')
    run(() => onAdd(Number(clean)))
  }

  return (
    <li className="space-y-2 px-5 py-3">
      <div className="flex items-center gap-3">
        <CategoryIcon category={category} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{item.description}</p>
          <p className="text-xs text-muted-foreground">Due {format(due.date, 'd MMM yyyy')}</p>
        </div>
        {hidden ? (
          // don't reveal the amount in an input while amounts are hidden
          <span className="text-sm font-extrabold">{formatRM(item.amount)}</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">RM</span>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={`Amount for ${item.description}`}
              className="w-24 text-right"
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(onSkip)}>
          Skip this month
        </Button>
        <Button size="sm" disabled={busy} onClick={add}>
          {busy ? 'Saving…' : 'Add'}
        </Button>
      </div>
      {error && <FormMessage>{error}</FormMessage>}
    </li>
  )
}
