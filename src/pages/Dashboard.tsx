import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, format, startOfMonth } from 'date-fns'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartBar,
  ChartColumn,
  Percent,
  PiggyBank,
  Plus,
  ReceiptText,
  Target,
} from 'lucide-react'
import BudgetSummary from '../components/BudgetSummary'
import DashboardHero from '../components/DashboardHero'
import DueRecurring from '../components/DueRecurring'
import EmptyState from '../components/EmptyState'
import { ErrorAlert } from '../components/Feedback'
import GoalsSummary from '../components/GoalsSummary'
import MonthPicker from '../components/MonthPicker'
import PageHeader from '../components/PageHeader'
import RecentTransactions from '../components/RecentTransactions'
import SectionCard from '../components/SectionCard'
import StatTile, { type Delta } from '../components/StatTile'
import CategoryBreakdown from '../components/charts/CategoryBreakdown'
import DailySpendingChart from '../components/charts/DailySpendingChart'
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

  const rate = income > 0 ? Math.round((balance / income) * 100) : null
  const previousRate = previous && previous.income > 0 ? Math.round(((previous.income - previous.expenses) / previous.income) * 100) : null
  const goalsSaved = goals.reduce((sum, g) => sum + g.current_amount, 0)
  const empty = !loading && transactions.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Your money in ${monthName}`}
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      {error && <ErrorAlert message={error} />}

      {/* Balance card + four stat tiles */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <DashboardHero month={month} balance={balance} income={income} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7">
          <StatTile
            label="Income"
            value={formatRM(income)}
            icon={ArrowDownLeft}
            keyColor={chartColors.income}
            delta={previous ? change(income, previous.income, previousName, true) : undefined}
          />
          <StatTile
            label="Expenses"
            value={formatRM(expenses)}
            icon={ArrowUpRight}
            keyColor={chartColors.expenses}
            delta={previous ? change(expenses, previous.expenses, previousName, false) : undefined}
          />
          <StatTile
            label="Savings rate"
            value={rate === null ? '—' : `${rate}%`}
            icon={Percent}
            delta={rate !== null && previousRate !== null ? rateChange(rate, previousRate, previousName) : undefined}
            detail={rate === null ? 'Add income to see it' : undefined}
          />
          <StatTile
            label="In savings goals"
            value={formatRM(goalsSaved)}
            icon={PiggyBank}
            detail={goals.length ? `Across ${goals.length} goal${goals.length === 1 ? '' : 's'}` : 'No goals yet'}
          />
        </div>
      </div>

      <DueRecurring categories={categories} />

      {empty ? (
        <Card>
          <EmptyState
            title="Nothing here yet"
            action={
              <Button asChild>
                <Link to="/transactions#add">
                  <Plus /> Add a transaction
                </Link>
              </Button>
            }
          >
            No transactions in {monthName}. Add one and your charts will fill in here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <SectionCard
              title="Cashflow"
              description="Income vs expenses, last 6 months"
              icon={ChartColumn}
              className="lg:col-span-8"
            >
              <MonthlyTrendChart totals={totals} />
            </SectionCard>
            <SectionCard
              title="Spending by category"
              description="Where your money went"
              icon={ChartBar}
              tone="orange"
              className="lg:col-span-4"
            >
              <CategoryBreakdown transactions={transactions} categories={categories} month={month} />
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <SectionCard
              title="Recent transactions"
              description={monthName}
              icon={ReceiptText}
              className="lg:col-span-8"
              actions={
                <Button asChild variant="ghost" size="sm" className="font-bold text-primary hover:text-primary">
                  <Link to="/transactions">See all</Link>
                </Button>
              }
            >
              <RecentTransactions transactions={transactions} categories={categories} />
            </SectionCard>
            <SectionCard title="Budgets" description="Closest to their limit first" icon={Target} className="lg:col-span-4">
              <BudgetSummary budgets={budgets} categories={categories} transactions={transactions} pace={monthProgress(month)} limit={3} />
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <SectionCard title="Daily spending" description={monthName} icon={CalendarDays} tone="orange" className="lg:col-span-8">
              <DailySpendingChart transactions={transactions} month={month} />
            </SectionCard>
            <SectionCard title="Savings goals" description="Unfinished goals first" icon={PiggyBank} className="lg:col-span-4">
              <GoalsSummary goals={goals} />
            </SectionCard>
          </div>
        </>
      )}

      {empty && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Budgets" description="Closest to their limit first" icon={Target}>
            <BudgetSummary budgets={budgets} categories={categories} transactions={transactions} pace={monthProgress(month)} />
          </SectionCard>
          <SectionCard title="Savings goals" description="Unfinished goals first" icon={PiggyBank}>
            <GoalsSummary goals={goals} />
          </SectionCard>
        </div>
      )}
    </div>
  )
}

// Change vs the previous month, coloured by whether it's good news
function change(current: number, previous: number, previousName: string, upIsGood: boolean): Delta {
  if (previous === 0) return { text: `Nothing in ${previousName}`, direction: 'flat', pct: null }
  const diff = current - previous
  if (Math.abs(diff) < 0.005) return { text: `Same as ${previousName}`, direction: 'flat', pct: 0 }
  return {
    text: `${diff > 0 ? '+' : '−'}${formatRM(Math.abs(diff))} vs ${previousName}`,
    direction: diff > 0 ? 'up' : 'down',
    pct: (diff / previous) * 100,
    good: diff > 0 === upIsGood,
  }
}

// Savings rate moves in percentage points, so no percent badge
function rateChange(rate: number, previousRate: number, previousName: string): Delta {
  const diff = rate - previousRate
  if (diff === 0) return { text: `Same as ${previousName}`, direction: 'flat' }
  return {
    text: `${diff > 0 ? 'Up' : 'Down'} ${Math.abs(diff)} points from ${previousName}`,
    direction: diff > 0 ? 'up' : 'down',
    good: diff > 0,
  }
}
