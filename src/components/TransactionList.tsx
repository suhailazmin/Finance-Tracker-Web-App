import { useState, type ReactNode } from 'react'
import { format, isThisYear, parseISO } from 'date-fns'
import { CloudOff, Pencil, Repeat, Trash2 } from 'lucide-react'
import CategoryIcon from './CategoryIcon'
import TransactionDetails from './TransactionDetails'
import TransactionForm from './TransactionForm'
import { Button } from '@/components/ui/button'
import { findRule } from '../lib/categorize'
import { formatRM } from '../lib/format'
import type { Category, CategoryRule, Transaction, TransactionInput } from '../lib/types'

type Props = {
  transactions: Transaction[] // newest first
  categories: Category[]
  rules: CategoryRule[]
  onUpdate: (id: string, input: TransactionInput) => Promise<string | undefined>
  onRemove: (id: string, detail?: string, title?: string) => Promise<string | undefined>
  highlight?: string // search text to mark in descriptions
}

// Transactions grouped by day. Tap one for its details; edit inline; delete with Undo.
// Used for the month view and for search results.
export default function TransactionList({ transactions, categories, rules, onUpdate, onRemove, highlight }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const categoryOf = (t: Transaction) => (t.category_id ? categoryById.get(t.category_id) : undefined)

  // the Undo toast says exactly which one went: Deleted “Grab ride” · −RM 15.30 · Transport · 25 Nov 2026
  function remove(t: Transaction) {
    const detail = `${t.type === 'income' ? '+' : '−'}${formatRM(t.amount)} · ${categoryOf(t)?.name ?? 'Uncategorized'} · ${format(parseISO(t.date), 'd MMM yyyy')}`
    return onRemove(t.id, detail, `Deleted “${t.description}”`)
  }

  const details = transactions.find((t) => t.id === detailsId) ?? null
  // "more from this merchant": the auto-categorize keyword it matches (GRAB), else the whole description
  const merchantTerm = details ? (findRule(details.description, rules)?.keyword ?? details.description) : ''
  const merchantLabel = merchantTerm.length > 24 ? `${merchantTerm.slice(0, 23)}…` : merchantTerm

  // Group by date, keeping the newest-first order from the query
  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) groups.set(t.date, [...(groups.get(t.date) ?? []), t])

  return (
    <>
      <TransactionDetails
        transaction={details}
        category={details ? categoryOf(details) : undefined}
        merchant={{ label: `All “${merchantLabel}”`, to: `/transactions?q=${encodeURIComponent(merchantTerm)}&scope=all` }}
        onOpenChange={(open) => !open && setDetailsId(null)}
        onEdit={() => {
          setEditingId(detailsId)
          setDetailsId(null)
        }}
        onDelete={() => {
          if (details) void remove(details)
          setDetailsId(null)
        }}
      />
      {[...groups].map(([date, items]) => {
        const day = parseISO(date)
        return (
          <div key={date}>
            <h3 className="bg-muted/50 px-5 py-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {format(day, isThisYear(day) ? 'EEEE, d MMM' : 'EEEE, d MMM yyyy')}
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
                        const message = await onUpdate(t.id, input)
                        if (!message) setEditingId(null)
                        return message
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li key={t.id} className="flex items-center gap-1 py-1.5 pr-5 pl-2 transition-colors hover:bg-muted/40">
                    {/* the row itself opens the details */}
                    <button
                      type="button"
                      onClick={() => setDetailsId(t.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-haspopup="dialog"
                    >
                      <CategoryIcon category={category} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          <Highlighted text={t.description} match={highlight} />
                        </p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          {t.source === 'recurring' && (
                            <Repeat className="size-3 shrink-0 text-primary" aria-label="Recurring" />
                          )}
                          {category?.name ?? 'Uncategorized'}
                          {t.source === 'pending' && (
                            <span className="ml-1 inline-flex items-center gap-1 font-semibold text-brand-orange-ink">
                              <CloudOff className="size-3 shrink-0" aria-hidden="true" /> Waiting to sync
                            </span>
                          )}
                        </p>
                      </div>
                      <p className={`text-sm font-extrabold whitespace-nowrap ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                        {t.type === 'income' ? '+' : '−'}
                        {formatRM(t.amount)}
                      </p>
                    </button>
                    <div className="flex">
                      {/* queued offline entries can't be edited until they've synced */}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={t.source === 'pending'}
                        onClick={() => setEditingId(t.id)}
                        aria-label={`Edit ${t.description}`}
                        title="Edit"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        onClick={() => remove(t)}
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${t.description}`}
                        title="Delete"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </>
  )
}

// Marks every case-insensitive occurrence of `match` in `text`
function Highlighted({ text, match }: { text: string; match?: string }): ReactNode {
  const needle = match?.trim()
  if (!needle) return text
  const parts: ReactNode[] = []
  const lower = text.toLowerCase()
  const n = needle.toLowerCase()
  let i = 0
  for (let at = lower.indexOf(n); at >= 0; at = lower.indexOf(n, i)) {
    if (at > i) parts.push(text.slice(i, at))
    parts.push(
      <mark key={at} className="rounded-sm bg-brand-orange/35 px-0.5 text-inherit">
        {text.slice(at, at + needle.length)}
      </mark>
    )
    i = at + needle.length
  }
  parts.push(text.slice(i))
  return parts
}
