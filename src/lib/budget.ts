import { endOfMonth, getDate, getDaysInMonth, isAfter, isSameMonth } from 'date-fns'

export type BudgetStatus = 'good' | 'warning' | 'over'

// Under 75% used is on track, 75–100% is close to the limit, above 100% is over
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  const used = limit > 0 ? spent / limit : 0
  if (used > 1) return 'over'
  if (used >= 0.75) return 'warning'
  return 'good'
}

// Status colours are reserved for status and always shown with an icon + label
export const statusStyle: Record<BudgetStatus, { color: string; icon: string; label: string }> = {
  good: { color: '#0ca30c', icon: '✓', label: 'On track' },
  warning: { color: '#fab219', icon: '!', label: 'Close to limit' },
  over: { color: '#d03b3b', icon: '✕', label: 'Over budget' },
}

// How far through the month we are (0–1), for the "today" marker on budget bars.
// Past months are complete; future months haven't started.
export function monthProgress(month: Date, today = new Date()): number {
  if (isSameMonth(month, today)) return getDate(today) / getDaysInMonth(month)
  return isAfter(today, endOfMonth(month)) ? 1 : 0
}
