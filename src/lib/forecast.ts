import { getDaysInMonth, isSameMonth, startOfMonth } from 'date-fns'
import { monthKey } from './recurring'
import type { RecurringTransaction, Transaction } from './types'
import { sumRM, toSen } from './money'

// Month-end spending forecast:
//   spent so far
// + everyday spending rate × days left   (rate excludes recurring bills, so rent isn't "every day")
// + recurring expenses not yet added this month
// Only meaningful for the current month.

export type Forecast = {
  spent: number
  everydayRate: number // RM per day, excluding recurring bills
  everydayRest: number // expected everyday spending for the rest of the month
  upcomingRecurring: number // recurring expenses still to come this month
  projected: number
  daysElapsed: number
  daysLeft: number
  early: boolean // under a week of data: treat as a rough estimate
}

const EARLY_DAYS = 7

export function forecastMonth(
  transactions: Transaction[], // this month's transactions
  recurring: RecurringTransaction[],
  today: Date,
  categoryId?: string // forecast one category (for budgets)
): Forecast {
  const inScope = (catId: string | null) => categoryId === undefined || catId === categoryId
  const expenses = transactions.filter((t) => t.type === 'expense' && inScope(t.category_id))
  const spent = sumRM(expenses.map((t) => t.amount))
  const everydaySpent = sumRM(expenses.filter((t) => t.source !== 'recurring').map((t) => t.amount))

  const daysElapsed = today.getDate()
  const daysLeft = getDaysInMonth(today) - daysElapsed
  const everydayRate = everydaySpent / daysElapsed
  const everydayRest = everydayRate * daysLeft

  // recurring expenses that apply this month but haven't been added (or skipped) yet
  const thisMonth = monthKey(today)
  const upcomingRecurring = sumRM(
    recurring
      .filter(
        (r) =>
          r.active &&
          r.type === 'expense' &&
          inScope(r.category_id) &&
          r.start_month <= thisMonth &&
          (r.last_month === null || r.last_month < thisMonth)
      )
      .map((r) => r.amount)
  )

  return {
    spent,
    everydayRate,
    everydayRest,
    upcomingRecurring,
    projected: spent + everydayRest + upcomingRecurring,
    daysElapsed,
    daysLeft,
    early: daysElapsed < EARLY_DAYS,
  }
}

export const isCurrentMonth = (month: Date, today = new Date()) => isSameMonth(startOfMonth(month), today)

export type BudgetOutlook = 'over' | 'heading-over' | 'on-track'

// "over" = already past the limit; "heading-over" = will pass it at this pace
export function budgetOutlook(spent: number, projected: number, limit: number): BudgetOutlook {
  if (toSen(spent) > toSen(limit)) return 'over'
  if (toSen(projected) > toSen(limit)) return 'heading-over'
  return 'on-track'
}
