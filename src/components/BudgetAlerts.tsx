import { Link } from 'react-router-dom'
import { endOfMonth, format } from 'date-fns'
import { ShieldAlert } from 'lucide-react'
import CategoryIcon from './CategoryIcon'
import SectionCard from './SectionCard'
import { Button } from '@/components/ui/button'
import { statusStyle } from '../lib/budget'
import { budgetOutlook, forecastMonth, type BudgetOutlook } from '../lib/forecast'
import { formatRM } from '../lib/format'
import type { Budget, Category, RecurringTransaction, Transaction } from '../lib/types'

type Props = {
  budgets: Budget[]
  categories: Category[]
  transactions: Transaction[] // this month's
  recurring: RecurringTransaction[]
  today: Date
  className?: string
}

const LOOK: Record<BudgetOutlook, { style: (typeof statusStyle)['good']; label: string }> = {
  over: { style: statusStyle.over, label: 'Over budget' },
  'heading-over': { style: statusStyle.warning, label: 'Heading over' },
  'on-track': { style: statusStyle.good, label: 'On track' },
}

// Warns before a budget is blown: compares each category's month-end forecast with its limit
export default function BudgetAlerts({ budgets, categories, transactions, recurring, today, className }: Props) {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const rows = budgets
    .map((b) => {
      const f = forecastMonth(transactions, recurring, today, b.category_id)
      return { budget: b, category: byId.get(b.category_id), spent: f.spent, projected: f.projected, outlook: budgetOutlook(f.spent, f.projected, b.limit_amount) }
    })
    .filter((r) => r.outlook !== 'on-track')
    // already over first, then the furthest past its limit
    .sort((a, b) => (a.outlook === b.outlook ? b.projected / b.budget.limit_amount - a.projected / a.budget.limit_amount : a.outlook === 'over' ? -1 : 1))

  return (
    <SectionCard
      title="Budget alerts"
      description={`Forecast to ${format(endOfMonth(today), 'd MMM')}`}
      icon={ShieldAlert}
      tone={rows.length ? 'orange' : 'green'}
      className={className}
      actions={
        <Button asChild variant="ghost" size="sm" className="font-bold text-primary hover:text-primary">
          <Link to="/budgets">Budgets</Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm">
          <StatusIcon outlook="on-track" />
          All {budgets.length} budget{budgets.length === 1 ? ' is' : 's are'} on track for this month.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 4).map((r) => (
            <li key={r.budget.id} className="flex items-start gap-3">
              <CategoryIcon category={r.category} className="size-9" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="flex flex-wrap items-center gap-x-2 font-bold">
                  {r.category?.name ?? 'Category'}
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <StatusIcon outlook={r.outlook} />
                    {LOOK[r.outlook].label}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {r.outlook === 'over' ? (
                    <>
                      Spent {formatRM(r.spent)} of {formatRM(r.budget.limit_amount)}, on pace for{' '}
                      <strong className="text-foreground">{formatRM(Math.round(r.projected))}</strong>
                    </>
                  ) : (
                    <>
                      On pace for <strong className="text-foreground">{formatRM(Math.round(r.projected))}</strong> of{' '}
                      {formatRM(r.budget.limit_amount)}, about {formatRM(Math.round(r.projected - r.budget.limit_amount))} over
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
          {rows.length > 4 && <li className="text-xs text-muted-foreground">+{rows.length - 4} more on the Budgets page</li>}
        </ul>
      )}
    </SectionCard>
  )
}

function StatusIcon({ outlook }: { outlook: BudgetOutlook }) {
  const { style } = LOOK[outlook]
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: style.color }}
      aria-hidden="true"
    >
      {style.icon}
    </span>
  )
}
