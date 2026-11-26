import { useState, type FormEvent } from 'react'
import { addMonths, format, startOfMonth } from 'date-fns'
import { Copy } from 'lucide-react'
import BudgetMeter from '../components/BudgetMeter'
import { ErrorAlert, FormMessage } from '../components/Feedback'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import MonthPicker from '../components/MonthPicker'
import { useBudgets } from '../hooks/useBudgets'
import { useCategories } from '../hooks/useCategories'
import { useTransactions } from '../hooks/useTransactions'
import { monthProgress } from '../lib/budget'
import { formatRM } from '../lib/format'
import type { Budget, Category } from '../lib/types'

// Positive RM amount with at most 2 decimal places
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

export default function Budgets() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [copyMessage, setCopyMessage] = useState('')
  const { categories } = useCategories()
  const { transactions } = useTransactions(month)
  const { budgets, loading, error, set, remove, copyFromPreviousMonth } = useBudgets(month)

  const spentByCategory = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense' && t.category_id) {
      spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + t.amount)
    }
  }
  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]))
  const expenseCategories = categories.filter((c) => c.type === 'expense')
  // budgeted categories first, so the limits are easy to scan
  const sorted = [...expenseCategories].sort(
    (a, b) => Number(budgetByCategory.has(b.id)) - Number(budgetByCategory.has(a.id))
  )

  const totalLimit = budgets.reduce((sum, b) => sum + b.limit_amount, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (spentByCategory.get(b.category_id) ?? 0), 0)
  const pace = monthProgress(month)
  const previousName = format(addMonths(month, -1), 'MMMM')

  async function handleCopy() {
    const { error, copied } = await copyFromPreviousMonth()
    setCopyMessage(error || (copied ? `Copied ${copied} budget${copied === 1 ? '' : 's'} from ${previousName}.` : `No budgets in ${previousName} to copy.`))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Monthly spending limits for each category."
        actions={<MonthPicker month={month} onChange={(m) => { setMonth(m); setCopyMessage('') }} />}
      />
      {error && <ErrorAlert message={error} />}

      {budgets.length > 0 && (
        <SectionCard
          title="Total"
          actions={
            <p className="text-sm text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{formatRM(totalSpent)}</span> of {formatRM(totalLimit)}
            </p>
          }
        >
          <BudgetMeter spent={totalSpent} limit={totalLimit} pace={pace} />
          {pace > 0 && pace < 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              The grey line marks today: {Math.round(pace * 100)}% of {format(month, 'MMMM')} has passed.
            </p>
          )}
        </SectionCard>
      )}

      {!loading && budgets.length === 0 && (
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            No budgets for {format(month, 'MMMM yyyy')} yet. Set a limit below, or:
          </p>
          <Button variant="outline" onClick={handleCopy} className="mt-3">
            <Copy />
            Copy {previousName}’s budgets
          </Button>
          {copyMessage && <p className="mt-2 text-sm text-muted-foreground">{copyMessage}</p>}
        </SectionCard>
      )}

      <Card className="gap-0 divide-y py-0">
        {sorted.map((c) => (
          <BudgetRow
            key={c.id}
            category={c}
            budget={budgetByCategory.get(c.id)}
            spent={spentByCategory.get(c.id) ?? 0}
            pace={pace}
            onSave={(limit) => set(c.id, limit)}
            onRemove={(b) => remove(b.id)}
          />
        ))}
      </Card>
    </div>
  )
}

type RowProps = {
  category: Category
  budget?: Budget
  spent: number
  pace: number
  onSave: (limit: number) => Promise<string | undefined>
  onRemove: (budget: Budget) => Promise<string | undefined>
}

function BudgetRow({ category, budget, spent, pace, onSave, onRemove }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function startEditing() {
    setValue(budget ? budget.limit_amount.toFixed(2) : '')
    setError('')
    setEditing(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = value.trim().replace(/,/g, '')
    if (!AMOUNT_PATTERN.test(clean) || Number(clean) <= 0) {
      setError('Enter an amount above RM 0 with at most 2 decimal places.')
      return
    }
    setBusy(true)
    const message = await onSave(Number(clean))
    setBusy(false)
    if (message) setError(message)
    else setEditing(false)
  }

  async function handleRemove() {
    if (!budget || !window.confirm(`Remove the ${category.name} budget?`)) return
    const message = await onRemove(budget)
    if (message) window.alert(message)
  }

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="size-2 rounded-full" style={{ backgroundColor: category.color ?? '#64748b' }} />
          {category.name}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {budget ? (
            <>
              <span className="font-medium text-foreground">{formatRM(spent)}</span> of {formatRM(budget.limit_amount)}
            </>
          ) : (
            <>{formatRM(spent)} spent · no limit</>
          )}
        </span>
      </div>

      {budget && !editing && (
        <div className="mt-3">
          <BudgetMeter spent={spent} limit={budget.limit_amount} pace={pace} />
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">RM</span>
          <Input
            autoFocus
            inputMode="decimal"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`Monthly limit for ${category.name}`}
            className="w-32"
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          {error && <FormMessage className="w-full">{error}</FormMessage>}
        </form>
      ) : (
        <div className="mt-2 -ml-2.5 flex gap-1">
          <Button variant="ghost" size="sm" onClick={startEditing} className="text-primary hover:text-primary">
            {budget ? 'Change limit' : 'Set budget'}
          </Button>
          {budget && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
