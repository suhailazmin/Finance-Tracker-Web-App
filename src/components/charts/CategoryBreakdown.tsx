import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { chartColors } from '../../lib/chartTheme'
import { formatRM } from '../../lib/format'
import type { Category, Transaction } from '../../lib/types'

// month: when given, each row links to that category's transactions for the month
type Props = { transactions: Transaction[]; categories: Category[]; month?: Date }

// Small but non-zero shares show "<1%" rather than a misleading "0%"
const formatShare = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`)

// Ranked horizontal bars: one hue for magnitude, the category's own colour only as a key dot
export default function CategoryBreakdown({ transactions, categories, month }: Props) {
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const key = t.category_id ?? ''
    totals.set(key, (totals.get(key) ?? 0) + t.amount)
  }

  const rows = [...totals]
    .map(([id, amount]) => ({ id, amount, category: categoryById.get(id) }))
    .sort((a, b) => b.amount - a.amount)
  const total = rows.reduce((sum, r) => sum + r.amount, 0)
  const max = rows[0]?.amount ?? 0

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No spending this month.</p>

  return (
    <ul className={month ? 'space-y-1' : 'space-y-3'}>
      {rows.map((r) => {
        const bar = (
          <>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.category?.color ?? '#cbd5e1' }} />
              {r.category?.name ?? 'Uncategorized'}
            </span>
            <span className="whitespace-nowrap tabular-nums text-foreground">
              {formatRM(r.amount)}
              <span className="ml-2 inline-block w-10 text-right text-muted-foreground">
                {formatShare(r.amount / total)}
              </span>
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded-r bg-muted">
            <div
              className="h-full rounded-r"
              style={{ width: `${(r.amount / max) * 100}%`, backgroundColor: chartColors.expenses }}
            />
          </div>
          </>
        )
        const label = `${r.category?.name ?? 'Uncategorized'}: ${formatRM(r.amount)}`
        return (
          <li key={r.id} className="text-sm" title={label}>
            {month ? (
              <Link
                to={`/transactions?category=${r.id || 'none'}&scope=month&month=${format(month, 'yyyy-MM')}`}
                className="-mx-2 block rounded-lg px-2 py-1 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`${label}. See these transactions`}
              >
                {bar}
              </Link>
            ) : (
              bar
            )}
          </li>
        )
      })}
    </ul>
  )
}
