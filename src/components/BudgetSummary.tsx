import { Link } from 'react-router-dom'
import BudgetMeter from './BudgetMeter'
import { formatRM } from '../lib/format'
import type { Budget, Category, Transaction } from '../lib/types'
import { spentByCategory } from '../lib/budget'

type Props = {
  budgets: Budget[]
  categories: Category[]
  transactions: Transaction[]
  pace: number
  limit?: number
}

// Dashboard card: the budgets closest to (or over) their limit
export default function BudgetSummary({ budgets, categories, transactions, pace, limit = 4 }: Props) {
  if (budgets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No budgets this month.{' '}
        <Link to="/budgets" className="font-medium text-primary hover:underline">
          Set spending limits →
        </Link>
      </p>
    )
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const spentIn = spentByCategory(transactions)
  const rows = budgets
    .map((b) => {
      const spent = spentIn.get(b.category_id) ?? 0
      return { budget: b, spent, used: spent / b.limit_amount, category: categoryById.get(b.category_id) }
    })
    .sort((a, b) => b.used - a.used)

  return (
    <div className="space-y-4">
      {rows.slice(0, limit).map((r) => (
        <div key={r.budget.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.category?.color ?? '#64748b' }} />
              {r.category?.name ?? 'Category'}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatRM(r.spent)} / {formatRM(r.budget.limit_amount)}
            </span>
          </div>
          <BudgetMeter spent={r.spent} limit={r.budget.limit_amount} pace={pace} />
        </div>
      ))}
      <Link to="/budgets" className="inline-block text-sm font-medium text-primary hover:underline">
        {rows.length > limit ? `See all ${rows.length} budgets →` : 'Manage budgets →'}
      </Link>
    </div>
  )
}
