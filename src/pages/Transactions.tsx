import { useState } from 'react'
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { Pencil, ReceiptText, Trash2 } from 'lucide-react'
import { ErrorAlert } from '../components/Feedback'
import MonthPicker from '../components/MonthPicker'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import TransactionForm from '../components/TransactionForm'
import { useCategories } from '../hooks/useCategories'
import { useCategoryRules } from '../hooks/useCategoryRules'
import { useTransactions } from '../hooks/useTransactions'
import { formatRM } from '../lib/format'
import type { Category, Transaction, TransactionInput } from '../lib/types'

export default function Transactions() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const { categories } = useCategories()
  const { rules } = useCategoryRules()
  const { transactions, loading, error, add, update, remove } = useTransactions(month)

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

  // Group by date, keeping the newest-first order from the query
  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) groups.set(t.date, [...(groups.get(t.date) ?? []), t])

  async function handleAdd(input: TransactionInput) {
    const message = await add(input)
    // jump to the month of the new transaction so it is visible
    const added = parseISO(input.date)
    if (!message && !isSameMonth(added, month)) setMonth(startOfMonth(added))
    return message
  }

  async function handleDelete(t: Transaction) {
    if (!window.confirm(`Delete "${t.description}" (${formatRM(t.amount)})?`)) return
    const message = await remove(t.id)
    if (message) window.alert(message)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" actions={<MonthPicker month={month} onChange={setMonth} />} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Income" value={formatRM(income)} className="text-primary" />
        <Stat label="Expenses" value={formatRM(expenses)} className="text-destructive" />
        <Stat label="Balance" value={formatRM(income - expenses)} />
      </div>

      <SectionCard title="Add transaction">
        <TransactionForm categories={categories} rules={rules} onSubmit={handleAdd} />
      </SectionCard>

      <Card className="gap-0 py-0">
        {error && <ErrorAlert message={error} className="m-5 w-auto" />}
        {!error && loading && transactions.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">Loading…</p>
        )}
        {!error && !loading && transactions.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <ReceiptText className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No transactions in {format(month, 'MMMM yyyy')} yet.</p>
          </div>
        )}

        {[...groups].map(([date, items], i) => (
          <div key={date}>
            <h3
              className={`border-b bg-muted/50 px-5 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase ${i > 0 ? 'border-t' : ''}`}
            >
              {format(parseISO(date), 'EEE, d MMM')}
            </h3>
            <ul className="divide-y">
              {items.map((t) =>
                editingId === t.id ? (
                  <li key={t.id} className="p-5">
                    <TransactionForm
                      categories={categories}
                      rules={rules}
                      initial={t}
                      onSubmit={async (input) => {
                        const message = await update(t.id, input)
                        if (!message) setEditingId(null)
                        return message
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <CategoryTag category={t.category_id ? categoryById.get(t.category_id) : undefined} />
                    </div>
                    <p
                      className={`text-sm font-semibold whitespace-nowrap tabular-nums ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {formatRM(t.amount)}
                    </p>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(t.id)}
                        aria-label={`Edit ${t.description}`}
                        title="Edit"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t)}
                        aria-label={`Delete ${t.description}`}
                        title="Delete"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </Card>
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card size="sm" className="gap-1 px-3">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className={`text-sm font-semibold tabular-nums sm:text-lg ${className ?? ''}`}>{value}</p>
    </Card>
  )
}

function CategoryTag({ category }: { category?: Category }) {
  return (
    <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: category?.color ?? '#cbd5e1' }} />
      {category?.name ?? 'Uncategorized'}
    </span>
  )
}
