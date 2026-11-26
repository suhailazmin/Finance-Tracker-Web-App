import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, format, startOfMonth } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, ReceiptText, Wallet } from 'lucide-react'
import BudgetSummary from '../components/BudgetSummary'
import GoalsSummary from '../components/GoalsSummary'
import MonthPicker from '../components/MonthPicker'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import StatTile from '../components/StatTile'
import { ErrorAlert } from '../components/Feedback'
import CategoryBreakdown from '../components/charts/CategoryBreakdown'
import DailySpendingChart from '../components/charts/DailySpendingChart'
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  const monthName = format(month, 'MMMM yyyy')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Your money in ${monthName}`}
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Income" value={formatRM(income)} icon={ArrowDownLeft} keyColor={chartColors.income} />
        <StatTile
          label="Expenses"
          value={formatRM(expenses)}
          icon={ArrowUpRight}
          keyColor={chartColors.expenses}
          detail={previous ? spendingChange(expenses, previous.expenses, previousName) : undefined}
        />
        <StatTile label="Balance" value={formatRM(balance)} icon={Wallet} />
        <StatTile
          label="Saved"
          value={income > 0 ? `${Math.round((balance / income) * 100)}%` : '—'}
          icon={PiggyBank}
          detail="of income this month"
        />
      </div>

      {!loading && transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <ReceiptText className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">Nothing here yet</p>
              <p className="text-sm text-muted-foreground">No transactions in {monthName}.</p>
            </div>
            <Button asChild>
              <Link to="/transactions">
                <Plus /> Add a transaction
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Spending by category" description="Where your money went">
            <CategoryBreakdown transactions={transactions} categories={categories} />
          </SectionCard>
          <SectionCard title="Daily spending" description={monthName}>
            <DailySpendingChart transactions={transactions} month={month} />
          </SectionCard>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Budgets" description="Closest to their limit first">
          <BudgetSummary budgets={budgets} categories={categories} transactions={transactions} pace={monthProgress(month)} />
        </SectionCard>
        <SectionCard title="Savings goals" description="Unfinished goals first">
          <GoalsSummary goals={goals} />
        </SectionCard>
      </div>

      <SectionCard title="Income vs expenses" description="Last 6 months">
        <MonthlyTrendChart totals={totals} />
      </SectionCard>
    </div>
  )
}

function spendingChange(current: number, previous: number, previousName: string) {
  if (previous === 0) return `Nothing spent in ${previousName}`
  const diff = current - previous
  if (Math.abs(diff) < 0.005) return `Same as ${previousName}`
  return `${formatRM(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${previousName}`
}
