import { differenceInCalendarDays, differenceInCalendarMonths, parseISO } from 'date-fns'
import type { SavingsGoal } from './types'
import type { MonthTotal } from '../hooks/useMonthlyTotals'

export type GoalPlan =
  | { kind: 'reached' }
  | { kind: 'no-date' }
  | { kind: 'overdue' }
  | { kind: 'monthly'; perMonth: number; months: number }

// How much to save each month to reach the goal by its target date
export function goalPlan(goal: SavingsGoal, today = new Date()): GoalPlan {
  const remaining = goal.target_amount - goal.current_amount
  if (remaining <= 0) return { kind: 'reached' }
  if (!goal.target_date) return { kind: 'no-date' }

  const target = parseISO(goal.target_date)
  if (differenceInCalendarDays(target, today) < 0) return { kind: 'overdue' }
  // a date later this month still counts as one month of saving
  const months = Math.max(1, differenceInCalendarMonths(target, today))
  return { kind: 'monthly', perMonth: remaining / months, months }
}

// Average monthly expenses over months that have any spending, or 0
export function averageMonthlyExpenses(totals: MonthTotal[]) {
  const withSpending = totals.filter((t) => t.expenses > 0)
  if (withSpending.length === 0) return 0
  return withSpending.reduce((sum, t) => sum + t.expenses, 0) / withSpending.length
}

// Round up to the next RM 100 so suggested targets are tidy
export const roundUpTo100 = (amount: number) => Math.ceil(amount / 100) * 100

export const EMERGENCY_FUND_NAME = 'Emergency fund'
