import { useState, type ReactNode } from 'react'
import { format, isThisYear, parseISO } from 'date-fns'
import { Pencil, Repeat, Trash2 } from 'lucide-react'
import CategoryIcon from './CategoryIcon'
import TransactionForm from './TransactionForm'
import { Button } from '@/components/ui/button'
import { formatRM } from '../lib/format'
import type { Category, CategoryRule, Transaction, TransactionInput } from '../lib/types'

type Props = {
  transactions: Transaction[] // newest first
  categories: Category[]
  rules: CategoryRule[]
  onUpdate: (id: string, input: TransactionInput) => Promise<string | undefined>
  onRemove: (id: string, detail?: string) => Promise<string | undefined>
  highlight?: string // search text to mark in descriptions
}

// Transactions grouped by day, with inline edit and confirmed delete.
// Used for the month view and for search results.
export default function TransactionList({ transactions, categories, rules, onUpdate, onRemove, highlight }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  // Group by date, keeping the newest-first order from the query
  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) groups.set(t.date, [...(groups.get(t.date) ?? []), t])

  return (
    <>
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
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
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
                      </p>
                    </div>
                    <p className={`text-sm font-extrabold whitespace-nowrap ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
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
                      <Button
                        onClick={() => onRemove(t.id, `${t.description} · ${t.type === 'income' ? '+' : '−'}${formatRM(t.amount)}`)}
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
