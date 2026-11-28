import { describe, expect, it } from 'vitest'
import { forecastMonth } from './forecast'
import type { RecurringTransaction, Transaction } from './types'

const tx = (amount: number, extra: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  date: '2026-11-05',
  description: 'Lunch',
  amount,
  type: 'expense',
  category_id: 'food',
  source: 'manual',
  ...extra,
})
const bill = (description: string, amount: number, extra: Partial<RecurringTransaction> = {}): RecurringTransaction => ({
  id: crypto.randomUUID(),
  description,
  amount,
  type: 'expense',
  category_id: 'bills',
  day_of_month: 25,
  start_month: '2026-01-01',
  last_month: '2026-10-01',
  auto_add: true,
  active: true,
  ...extra,
})

// 10 Nov 2026: 10 days recorded, 20 to go
const today = new Date(2026, 10, 10)

describe('forecastMonth: what goes into it', () => {
  it('keeps everyday spending and recurring bills apart', () => {
    const f = forecastMonth([tx(30), tx(70), tx(1200, { source: 'recurring', description: 'Rent' })], [], today)
    expect(f.spent).toBe(1300)
    expect(f.everydaySpent).toBe(100)
    expect(f.recurringSpent).toBe(1200)
    expect(f.everydayRate).toBe(10)
    expect(f.everydayRest).toBe(200)
    expect(f.daysElapsed).toBe(10)
    expect(f.daysLeft).toBe(20)
  })

  it('lists the recurring bills still to come, biggest first', () => {
    const f = forecastMonth([], [bill('Unifi', 129), bill('Rent', 1200), bill('Gym', 99, { last_month: '2026-11-01' })], today)
    expect(f.upcoming).toEqual([
      { description: 'Rent', amount: 1200 },
      { description: 'Unifi', amount: 129 },
    ])
    expect(f.upcomingRecurring).toBe(1329)
  })

  it('flags the first week as a rough estimate', () => {
    expect(forecastMonth([tx(10)], [], new Date(2026, 10, 3)).early).toBe(true)
    expect(forecastMonth([tx(10)], [], new Date(2026, 10, 7)).early).toBe(false)
  })
})

describe('forecastMonth: one big purchase', () => {
  it('points out a big one-off and what the forecast would be without it', () => {
    // RM 600 everyday in 10 days, RM 500 of it one purchase
    const f = forecastMonth([tx(500, { description: 'Car repair' }), tx(60), tx(40)], [], today)
    expect(f.projected).toBe(600 + 60 * 20)
    expect(f.oneOff).toEqual({ description: 'Car repair', amount: 500, projectedWithout: 600 + 10 * 20 })
  })

  it('says nothing when spending is spread out', () => {
    expect(forecastMonth([tx(20), tx(25), tx(30), tx(22), tx(28)], [], today).oneOff).toBeNull()
  })

  it('says nothing when the purchase barely changes the forecast', () => {
    // RM 20 is most of the spending, but it only adds RM 40 to the forecast
    expect(forecastMonth([tx(20), tx(5)], [], today).oneOff).toBeNull()
  })

  it('needs more than one purchase to compare with, and ignores recurring bills', () => {
    expect(forecastMonth([tx(500)], [], today).oneOff).toBeNull()
    expect(forecastMonth([tx(1200, { source: 'recurring' }), tx(30), tx(20)], [], today).oneOff).toBeNull()
  })
})
