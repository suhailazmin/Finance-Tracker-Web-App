import { chartColors } from '../../lib/chartTheme'
import { formatRM } from '../../lib/format'
import type { Category, Transaction } from '../../lib/types'

type Props = { transactions: Transaction[]; categories: Category[] }

// Small but non-zero shares show "<1%" rather than a misleading "0%"
const formatShare = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`)

// Ranked horizontal bars: one hue for magnitude, the category's own colour only as a key dot
export default function CategoryBreakdown({ transactions, categories }: Props) {
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

  if (rows.length === 0) return <p className="text-sm text-slate-500">No spending this month.</p>

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="text-sm" title={`${r.category?.name ?? 'Uncategorized'}: ${formatRM(r.amount)}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.category?.color ?? '#cbd5e1' }} />
              {r.category?.name ?? 'Uncategorized'}
            </span>
            <span className="whitespace-nowrap tabular-nums text-slate-900">
              {formatRM(r.amount)}
              <span className="ml-2 inline-block w-10 text-right text-slate-500">
                {formatShare(r.amount / total)}
              </span>
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded-r bg-slate-100">
            <div
              className="h-full rounded-r"
              style={{ width: `${(r.amount / max) * 100}%`, backgroundColor: chartColors.expenses }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
