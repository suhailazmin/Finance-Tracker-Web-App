import { format, parseISO } from 'date-fns'
import CategoryIcon from './CategoryIcon'
import EmptyState from './EmptyState'
import { formatRM } from '../lib/format'
import type { Category, Transaction } from '../lib/types'

type Props = { transactions: Transaction[]; categories: Category[]; limit?: number }

// The latest transactions as icon rows (transactions arrive newest first)
export default function RecentTransactions({ transactions, categories, limit = 6 }: Props) {
  if (transactions.length === 0) {
    return <EmptyState title="No transactions yet" className="py-4" />
  }
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (
    <ul className="-mx-2 divide-y divide-border/70">
      {transactions.slice(0, limit).map((t) => {
        const category = t.category_id ? categoryById.get(t.category_id) : undefined
        return (
          <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50">
            <CategoryIcon category={category} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{t.description}</p>
              <p className="truncate text-xs text-muted-foreground">
                {category?.name ?? 'Uncategorized'} · {format(parseISO(t.date), 'd MMM yyyy')}
              </p>
            </div>
            <p className={`text-sm font-extrabold whitespace-nowrap ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
              {t.type === 'income' ? '+' : '−'}
              {formatRM(t.amount)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
