import { useState } from 'react'
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import MonthPicker from '../components/MonthPicker'
import TransactionForm from '../components/TransactionForm'
import { useCategories } from '../hooks/useCategories'
import { useTransactions } from '../hooks/useTransactions'
import { formatRM } from '../lib/format'
import type { Category, Transaction, TransactionInput } from '../lib/types'

export default function Transactions() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const { categories } = useCategories()
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Income" value={formatRM(income)} className="text-emerald-700" />
        <Stat label="Expenses" value={formatRM(expenses)} className="text-red-700" />
        <Stat label="Balance" value={formatRM(income - expenses)} className="text-slate-900" />
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-semibold">Add transaction</h2>
        <TransactionForm categories={categories} onSubmit={handleAdd} />
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {error && <p className="p-5 text-sm text-red-700">{error}</p>}
        {!error && loading && transactions.length === 0 && <p className="p-5 text-sm text-slate-500">Loading…</p>}
        {!error && !loading && transactions.length === 0 && (
          <p className="p-5 text-sm text-slate-500">No transactions in {format(month, 'MMMM yyyy')} yet.</p>
        )}

        {[...groups].map(([date, items]) => (
          <div key={date}>
            <h3 className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {format(parseISO(date), 'EEE, d MMM')}
            </h3>
            <ul className="divide-y divide-slate-100">
              {items.map((t) =>
                editingId === t.id ? (
                  <li key={t.id} className="p-5">
                    <TransactionForm
                      categories={categories}
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
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.description}</p>
                      <CategoryTag category={t.category_id ? categoryById.get(t.category_id) : undefined} />
                    </div>
                    <p className={`whitespace-nowrap font-medium ${t.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {t.type === 'income' ? '+' : '−'}
                      {formatRM(t.amount)}
                    </p>
                    <div className="flex gap-1 text-sm">
                      <button onClick={() => setEditingId(t.id)} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(t)} className="rounded px-2 py-1 text-red-700 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <p className="text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold sm:text-lg ${className}`}>{value}</p>
    </div>
  )
}

function CategoryTag({ category }: { category?: Category }) {
  return (
    <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category?.color ?? '#cbd5e1' }} />
      {category?.name ?? 'Uncategorized'}
    </span>
  )
}
