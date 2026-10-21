import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, format, startOfMonth } from 'date-fns'
import BudgetSummary from '../components/BudgetSummary'
import GoalsSummary from '../components/GoalsSummary'
import MonthPicker from '../components/MonthPicker'
import StatTile from '../components/StatTile'
import CategoryBreakdown from '../components/charts/CategoryBreakdown'
import DailySpendingChart from '../components/charts/DailySpendingChart'
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart'
import { useBudgets } from '../hooks/useBudgets'
import { useCategories } from '../hooks/useCategories'
import { useMonthlyTotals } from '../hooks/useMonthlyTotals'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { useTransactions } from '../hooks/useTransactions'
import { monthProgress } from '../lib/budget'
import { chartColors } from '../lib/chartTheme'
import { formatRM } from '../lib/format'

export default function Dashboard() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const { categories } = useCategories()
  const { transactions, loading, error } = useTransactions(month)
  const { totals } = useMonthlyTotals(month, 6)
  const { budgets } = useBudgets(month)
  const { goals } = useSavingsGoals()

  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const balance = income - expenses
  const previous = totals.at(-2)
  const previousName = format(addMonths(month, -1), 'MMMM')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Income" value={formatRM(income)} keyColor={chartColors.income} />
        <StatTile
          label="Expenses"
          value={formatRM(expenses)}
          keyColor={chartColors.expenses}
          detail={previous ? spendingChange(expenses, previous.expenses, previousName) : undefined}
        />
        <StatTile label="Balance" value={formatRM(balance)} />
        <StatTile
          label="Saved"
          value={income > 0 ? `${Math.round((balance / income) * 100)}%` : '—'}
          detail="of income this month"
        />
      </div>

      {!loading && transactions.length === 0 ? (
        <Card title="Nothing here yet">
          <p className="text-sm text-slate-600">
            No transactions in {format(month, 'MMMM yyyy')}.{' '}
            <Link to="/transactions" className="text-emerald-700 hover:underline">
              Add your first one →
            </Link>
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Spending by category">
            <CategoryBreakdown transactions={transactions} categories={categories} />
          </Card>
          <Card title="Daily spending">
            <DailySpendingChart transactions={transactions} month={month} />
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Budgets">
          <BudgetSummary budgets={budgets} categories={categories} transactions={transactions} pace={monthProgress(month)} />
        </Card>
        <Card title="Savings goals">
          <GoalsSummary goals={goals} />
        </Card>
      </div>

      <Card title="Income vs expenses, last 6 months">
        <MonthlyTrendChart totals={totals} />
      </Card>
    </div>
  )
}

function spendingChange(current: number, previous: number, previousName: string) {
  if (previous === 0) return `Nothing spent in ${previousName}`
  const diff = current - previous
  if (Math.abs(diff) < 0.005) return `Same as ${previousName}`
  return `${formatRM(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${previousName}`
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  )
}
