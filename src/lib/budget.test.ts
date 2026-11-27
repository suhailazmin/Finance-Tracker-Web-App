import { describe, expect, it } from 'vitest'
import { budgetStatus, monthProgress, spentByCategory } from './budget'
import { budgetOutlook, forecastMonth } from './forecast'
import type { RecurringTransaction, Transaction } from './types'

const tx = (amount: number, category_id: string | null, extra: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  date: '2026-11-10',
  description: 'Test',
  amount,
  type: 'expense',
  category_id,
  source: 'manual',
  ...extra,
})

describe('budgetStatus', () => {
  it('is on track under 75% of the limit', () => {
    expect(budgetStatus(0, 500)).toBe('good')
    expect(budgetStatus(374.99, 500)).toBe('good')
  })

  it('is close to the limit from 75% up to the limit itself', () => {
    expect(budgetStatus(375, 500)).toBe('warning')
    expect(budgetStatus(499.99, 500)).toBe('warning')
    expect(budgetStatus(500, 500)).toBe('warning')
  })

  it('is over once spending passes the limit, even by one sen', () => {
    expect(budgetStatus(500.01, 500)).toBe('over')
    expect(budgetStatus(1200, 500)).toBe('over')
  })

  it('spending exactly the limit is not over, even when the sum drifts', () => {
    expect(budgetStatus(5 + 29.01 + 15.99, 50)).toBe('warning')
  })

  it('treats a zero limit as nothing used rather than dividing by zero', () => {
    expect(budgetStatus(100, 0)).toBe('good')
  })
})

describe('spentByCategory', () => {
  it('adds up expenses per category', () => {
    const spent = spentByCategory([tx(12.5, 'food'), tx(30, 'food'), tx(80, 'petrol')])
    expect(spent.get('food')).toBe(42.5)
    expect(spent.get('petrol')).toBe(80)
  })

  it('ignores income and uncategorized spending', () => {
    const spent = spentByCategory([tx(5000, 'food', { type: 'income' }), tx(20, null), tx(10, 'food')])
    expect(spent.get('food')).toBe(10)
    expect([...spent.keys()]).toEqual(['food'])
  })

  it('totals exactly, so a budget spent to the sen is not over', () => {
    const spent = spentByCategory([tx(5, 'food'), tx(29.01, 'food'), tx(15.99, 'food')])
    expect(spent.get('food')).toBe(50)
    expect(budgetStatus(spent.get('food')!, 50)).toBe('warning')
  })

  it('is empty with no transactions', () => {
    expect(spentByCategory([]).size).toBe(0)
  })
})

describe('monthProgress', () => {
  const today = new Date(2026, 10, 15) // 15 Nov 2026

  it('is the share of days gone in the current month', () => {
    expect(monthProgress(new Date(2026, 10, 1), today)).toBe(15 / 30)
    expect(monthProgress(new Date(2026, 10, 1), new Date(2026, 10, 30))).toBe(1)
  })

  it('is 1 for past months and 0 for future months', () => {
    expect(monthProgress(new Date(2026, 9, 1), today)).toBe(1)
    expect(monthProgress(new Date(2025, 10, 1), today)).toBe(1)
    expect(monthProgress(new Date(2026, 11, 1), today)).toBe(0)
  })

  it('uses the right number of days in February', () => {
    expect(monthProgress(new Date(2027, 1, 1), new Date(2027, 1, 14))).toBe(14 / 28)
    expect(monthProgress(new Date(2028, 1, 1), new Date(2028, 1, 14))).toBe(14 / 29)
  })
})

describe('budget alerts (budgetOutlook)', () => {
  it('is over once already past the limit', () => {
    expect(budgetOutlook(510, 900, 500)).toBe('over')
  })

  it('is heading over when the forecast passes the limit', () => {
    expect(budgetOutlook(300, 620, 500)).toBe('heading-over')
  })

  it('is on track when the forecast stays within the limit', () => {
    expect(budgetOutlook(300, 480, 500)).toBe('on-track')
    expect(budgetOutlook(500, 500, 500)).toBe('on-track')
  })

  it('does not raise an alert for float drift at exactly the limit', () => {
    expect(budgetOutlook(5 + 29.01 + 15.99, 50, 50)).toBe('on-track')
  })
})

describe('forecastMonth for one budget category', () => {
  const today = new Date(2026, 10, 10) // 10 Nov 2026: 10 days gone, 20 to go
  const recurring = (extra: Partial<RecurringTransaction>): RecurringTransaction => ({
    id: crypto.randomUUID(),
    description: 'Bill',
    amount: 100,
    type: 'expense',
    category_id: 'bills',
    day_of_month: 20,
    start_month: '2026-01-01',
    last_month: '2026-10-01',
    auto_add: true,
    active: true,
    ...extra,
  })

  it("projects the category's everyday rate over the rest of the month", () => {
    // RM 100 in 10 days is RM 10 a day, so 20 more days adds RM 200
    const f = forecastMonth([tx(60, 'food'), tx(40, 'food'), tx(999, 'petrol')], [], today, 'food')
    expect(f.spent).toBe(100)
    expect(f.everydayRest).toBe(200)
    expect(f.projected).toBe(300)
  })

  it('adds recurring bills still to come, but not ones already added this month', () => {
    const items = [
      recurring({ amount: 165 }), // still to come
      recurring({ amount: 129, last_month: '2026-11-01' }), // already added
      recurring({ amount: 50, active: false }), // paused
      recurring({ amount: 70, category_id: 'food' }), // another category
      recurring({ amount: 30, start_month: '2026-12-01' }), // starts next month
    ]
    expect(forecastMonth([], items, today, 'bills').upcomingRecurring).toBe(165)
  })

  it("doesn't count added recurring bills as everyday spending", () => {
    const f = forecastMonth([tx(1200, 'bills', { source: 'recurring' })], [], today, 'bills')
    expect(f.spent).toBe(1200)
    expect(f.everydayRest).toBe(0)
    expect(f.projected).toBe(1200)
  })
})
