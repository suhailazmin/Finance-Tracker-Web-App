import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Trash2, Wallet, type LucideIcon } from 'lucide-react'
import CategoryIcon from '../components/CategoryIcon'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { chartColors } from '../lib/chartTheme'
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
import type { Transaction, TransactionInput } from '../lib/types'

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

  // The phone's "+" button links to #add: bring the form into view and focus the amount
  const location = useLocation()
  useEffect(() => {
    if (location.hash !== '#add') return
    const form = document.getElementById('add')
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    form?.querySelector<HTMLInputElement>('input[inputmode="decimal"]')?.focus({ preventScroll: true })
  }, [location.key, location.hash])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Everything you earned and spent"
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Income" value={formatRM(income)} icon={ArrowDownLeft} color={chartColors.income} />
        <Stat label="Expenses" value={formatRM(expenses)} icon={ArrowUpRight} color={chartColors.expenses} />
        <Stat label="Balance" value={formatRM(income - expenses)} icon={Wallet} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div id="add" className="scroll-mt-24 lg:sticky lg:top-24">
          <SectionCard title="Add transaction" description="Categories are picked automatically" icon={Plus}>
            <TransactionForm categories={categories} rules={rules} onSubmit={handleAdd} />
          </SectionCard>
        </div>

        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-base font-bold">History</h2>
              <p className="text-sm text-muted-foreground">{format(month, 'MMMM yyyy')}</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">
              {transactions.length} item{transactions.length === 1 ? '' : 's'}
            </span>
          </div>

          {error && <ErrorAlert message={error} className="m-5 w-auto" />}
          {!error && loading && transactions.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">Loading…</p>
          )}
          {!error && !loading && transactions.length === 0 && (
            <EmptyState title="No transactions yet">
              Nothing recorded in {format(month, 'MMMM yyyy')}. Use the form to add one.
            </EmptyState>
          )}

          {[...groups].map(([date, items]) => (
            <div key={date}>
              <h3 className="bg-muted/50 px-5 py-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {format(parseISO(date), 'EEEE, d MMM')}
              </h3>
              <ul className="divide-y divide-border/70">
                {items.map((t) => {
                  const category = t.category_id ? categoryById.get(t.category_id) : undefined
                  return editingId === t.id ? (
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
                      <CategoryIcon category={category} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{t.description}</p>
                        <p className="truncate text-xs text-muted-foreground">{category?.name ?? 'Uncategorized'}</p>
                      </div>
                      <p
                        className={`text-sm font-extrabold whitespace-nowrap ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}
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
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Pencil />
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${t.description}`}
                              title="Delete"
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 />
                            </Button>
                          }
                          icon={Trash2}
                          destructive
                          title="Delete this transaction?"
                          description={
                            <>
                              “{t.description}” ({t.type === 'income' ? '+' : '−'}
                              {formatRM(t.amount)} on {format(parseISO(t.date), 'd MMM yyyy')}) will be removed. This
                              can’t be undone.
                            </>
                          }
                          confirmLabel="Delete"
                          onConfirm={() => remove(t.id)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// Compact tile so three fit side by side on a phone; the icon carries the colour, the value stays in text ink
function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: LucideIcon; color?: string }) {
  return (
    <Card size="sm" className="gap-2 px-3 sm:px-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground sm:text-sm">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary sm:size-8"
          style={color ? { backgroundColor: `color-mix(in srgb, ${color} 16%, white)`, color } : undefined}
        >
          <Icon className="size-3.5 sm:size-4" aria-hidden="true" />
        </span>
        {label}
      </p>
      <p className="text-sm font-extrabold tracking-tight sm:text-xl">{value}</p>
    </Card>
  )
}
