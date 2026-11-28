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
  everydaySpent: number // spent so far on everyday things (not recurring bills)
  recurringSpent: number // recurring bills already added this month
  everydayRate: number // RM per day, excluding recurring bills
  everydayRest: number // expected everyday spending for the rest of the month
  upcomingRecurring: number // recurring expenses still to come this month
  upcoming: { description: string; amount: number }[] // which ones, biggest first
  projected: number
  daysElapsed: number
  daysLeft: number
  early: boolean // under a week of data: treat as a rough estimate
  // one big everyday purchase pulls the daily rate up; the forecast without it, for comparison
  oneOff: { description: string; amount: number; projectedWithout: number } | null
}

// A single everyday expense counts as a "big one-off" when it's at least a quarter of everyday
// spending so far, at least 3× the average of the other purchases, and makes the forecast at
// least RM 50 higher
const ONE_OFF_SHARE = 0.25
const ONE_OFF_VS_OTHERS = 3
const ONE_OFF_MIN_EFFECT = 50

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
  const everyday = expenses.filter((t) => t.source !== 'recurring')
  const everydaySpent = sumRM(everyday.map((t) => t.amount))

  const daysElapsed = today.getDate()
  const daysLeft = getDaysInMonth(today) - daysElapsed
  const everydayRate = everydaySpent / daysElapsed
  const everydayRest = everydayRate * daysLeft

  // recurring expenses that apply this month but haven't been added (or skipped) yet
  const thisMonth = monthKey(today)
  const upcoming = recurring
    .filter(
      (r) =>
        r.active &&
        r.type === 'expense' &&
        inScope(r.category_id) &&
        r.start_month <= thisMonth &&
        (r.last_month === null || r.last_month < thisMonth)
    )
    .map((r) => ({ description: r.description, amount: r.amount }))
    .sort((a, b) => b.amount - a.amount)
  const upcomingRecurring = sumRM(upcoming.map((r) => r.amount))
  const projected = spent + everydayRest + upcomingRecurring

  // the biggest everyday purchase, if it alone is pushing the forecast up noticeably
  let oneOff: Forecast['oneOff'] = null
  const biggest = everyday.reduce<Transaction | null>((max, t) => (!max || t.amount > max.amount ? t : max), null)
  const othersAverage = biggest && everyday.length > 1 ? (everydaySpent - biggest.amount) / (everyday.length - 1) : 0
  if (
    biggest &&
    everyday.length > 1 &&
    biggest.amount >= everydaySpent * ONE_OFF_SHARE &&
    biggest.amount >= othersAverage * ONE_OFF_VS_OTHERS
  ) {
    const effect = (biggest.amount / daysElapsed) * daysLeft
    if (effect >= ONE_OFF_MIN_EFFECT) {
      oneOff = { description: biggest.description, amount: biggest.amount, projectedWithout: projected - effect }
    }
  }

  return {
    spent,
    everydaySpent,
    recurringSpent: sumRM([spent, -everydaySpent]),
    everydayRate,
    everydayRest,
    upcomingRecurring,
    upcoming,
    projected,
    daysElapsed,
    daysLeft,
    early: daysElapsed < EARLY_DAYS,
    oneOff,
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
