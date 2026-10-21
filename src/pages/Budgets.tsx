import { useState, type FormEvent } from 'react'
import { addMonths, format, startOfMonth } from 'date-fns'
import BudgetMeter from '../components/BudgetMeter'
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <MonthPicker month={month} onChange={(m) => { setMonth(m); setCopyMessage('') }} />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {budgets.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Total</h2>
            <p className="text-sm tabular-nums text-slate-600">
              <span className="font-semibold text-slate-900">{formatRM(totalSpent)}</span> of {formatRM(totalLimit)}
            </p>
          </div>
          <div className="mt-3">
            <BudgetMeter spent={totalSpent} limit={totalLimit} pace={pace} />
          </div>
          {pace > 0 && pace < 1 && (
            <p className="mt-2 text-xs text-slate-500">
              The grey line marks today: {Math.round(pace * 100)}% of {format(month, 'MMMM')} has passed.
            </p>
          )}
        </section>
      )}

      {!loading && budgets.length === 0 && (
        <section className="rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-600">No budgets for {format(month, 'MMMM yyyy')} yet. Set a limit below, or:</p>
          <button
            onClick={handleCopy}
            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100"
          >
            Copy {previousName}’s budgets
          </button>
          {copyMessage && <p className="mt-2 text-slate-600">{copyMessage}</p>}
        </section>
      )}

      <section className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
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
      </section>
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
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color ?? '#64748b' }} />
          {category.name}
        </span>
        <span className="text-sm tabular-nums text-slate-600">
          {budget ? (
            <>
              <span className="font-medium text-slate-900">{formatRM(spent)}</span> of {formatRM(budget.limit_amount)}
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
          <span className="text-sm text-slate-600">RM</span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Cancel
          </button>
          {error && <p className="w-full text-sm text-red-700">{error}</p>}
        </form>
      ) : (
        <div className="mt-2 flex gap-1 text-sm">
          <button onClick={startEditing} className="rounded px-2 py-1 text-emerald-700 hover:bg-emerald-50">
            {budget ? 'Change limit' : 'Set budget'}
          </button>
          {budget && (
            <button onClick={handleRemove} className="rounded px-2 py-1 text-red-700 hover:bg-red-50">
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
