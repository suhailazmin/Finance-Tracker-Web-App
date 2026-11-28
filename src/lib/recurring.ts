import { addMonths, format, getDaysInMonth, isAfter, parseISO, setDate, startOfDay, startOfMonth } from 'date-fns'
import type { RecurringTransaction } from './types'

// How far back to catch up if the app hasn't been opened for a while
const MAX_CATCH_UP_MONTHS = 24

export const monthKey = (d: Date) => format(startOfMonth(d), 'yyyy-MM-dd')

// The item's date within a month: the 31st becomes the 30th in November, the 28th/29th in February
export function occurrenceIn(month: Date, day: number): Date {
  const m = startOfMonth(month)
  return setDate(m, Math.min(day, getDaysInMonth(m)))
}

export type Due = { month: Date; date: Date }

// Months whose date has arrived and that haven't been added or skipped yet, oldest first
export function dueOccurrences(item: RecurringTransaction, today = new Date()): Due[] {
  if (!item.active) return []
  const start = parseISO(item.start_month)
  const afterLast = item.last_month ? addMonths(parseISO(item.last_month), 1) : start
  let month = isAfter(afterLast, start) ? afterLast : start
  const earliest = startOfMonth(addMonths(today, -MAX_CATCH_UP_MONTHS))
  if (isAfter(earliest, month)) month = earliest

  const due: Due[] = []
  const now = startOfDay(today)
  for (; !isAfter(month, startOfMonth(today)); month = addMonths(month, 1)) {
    const date = occurrenceIn(month, item.day_of_month)
    if (!isAfter(date, now)) due.push({ month, date })
  }
  return due
}

// "Ask me first" items whose date has come, one month at a time per item, oldest first
export function dueToConfirm(items: RecurringTransaction[], today = new Date()) {
  return items
    .filter((i) => i.active && !i.auto_add)
    .map((item) => ({ item, due: dueOccurrences(item, today)[0] }))
    .filter((d): d is { item: RecurringTransaction; due: Due } => Boolean(d.due))
    .sort((a, b) => a.due.date.getTime() - b.due.date.getTime())
}

// The next date it will be added or asked about (today or later, or an overdue one if any)
export function nextOccurrence(item: RecurringTransaction, today = new Date()): Date {
  const overdue = dueOccurrences(item, today)
  if (overdue.length) return overdue[0].date
  const start = parseISO(item.start_month)
  const afterLast = item.last_month ? addMonths(parseISO(item.last_month), 1) : start
  let month = isAfter(afterLast, start) ? afterLast : start
  // first month whose date is still ahead
  while (!isAfter(occurrenceIn(month, item.day_of_month), startOfDay(today)) && !isAfter(month, startOfMonth(today))) {
    month = addMonths(month, 1)
  }
  return occurrenceIn(month, item.day_of_month)
}

// "1st", "2nd", "23rd", ...
export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Stops the same month being added twice (unique (user_id, import_hash) in the database)
export const recurringHash = (id: string, month: Date) => `recurring:${id}:${format(month, 'yyyy-MM')}`
