import { describe, expect, it } from 'vitest'
import { averageMonthlyExpenses, goalPlan, roundUpTo100 } from './goals'
import type { SavingsGoal } from './types'

const today = new Date(2026, 10, 27) // 27 Nov 2026

const month = (expenses: number) => ({ month: '2026-01', income: 0, expenses })

const goal = (target_amount: number, current_amount: number, target_date: string | null = null): SavingsGoal => ({
  id: 'g1',
  name: 'Goal',
  target_amount,
  current_amount,
  target_date,
})

describe('goalPlan', () => {
  it('is reached once the saved amount meets or passes the target', () => {
    expect(goalPlan(goal(1000, 1000, '2027-06-01'), today)).toEqual({ kind: 'reached' })
    expect(goalPlan(goal(1000, 1500), today)).toEqual({ kind: 'reached' })
  })

  it('has no monthly plan without a target date', () => {
    expect(goalPlan(goal(1000, 200), today)).toEqual({ kind: 'no-date' })
  })

  it('is overdue once the target date has passed', () => {
    expect(goalPlan(goal(1000, 200, '2026-11-26'), today)).toEqual({ kind: 'overdue' })
    expect(goalPlan(goal(1000, 200, '2025-01-01'), today)).toEqual({ kind: 'overdue' })
  })

  it('is not overdue on the target date itself', () => {
    expect(goalPlan(goal(1000, 200, '2026-11-27'), today)).toEqual({ kind: 'monthly', perMonth: 800, months: 1 })
  })

  it('counts a date later this month as one month of saving', () => {
    expect(goalPlan(goal(1000, 400, '2026-11-30'), today)).toEqual({ kind: 'monthly', perMonth: 600, months: 1 })
  })

  it('splits what is left evenly over the months to go', () => {
    expect(goalPlan(goal(10000, 4000, '2027-11-27'), today)).toEqual({ kind: 'monthly', perMonth: 500, months: 12 })
    expect(goalPlan(goal(3000, 0, '2027-02-15'), today)).toEqual({ kind: 'monthly', perMonth: 1000, months: 3 })
  })

  it('rounds the monthly amount up to the sen, so saving it always reaches the target', () => {
    const plan = goalPlan(goal(1000, 0, '2027-02-27'), today)
    expect(plan).toEqual({ kind: 'monthly', perMonth: 333.34, months: 3 })
    if (plan.kind === 'monthly') expect(plan.perMonth * plan.months).toBeGreaterThanOrEqual(1000)
  })

  it('works out what is left exactly', () => {
    expect(goalPlan(goal(100, 99.99, '2026-12-27'), today)).toEqual({ kind: 'monthly', perMonth: 0.01, months: 1 })
  })
})

describe('averageMonthlyExpenses', () => {
  it('averages months that have spending', () => {
    expect(averageMonthlyExpenses([month(1000), month(2000), month(3000)])).toBe(2000)
  })

  it('skips months with no spending, so a new account is not dragged down', () => {
    expect(averageMonthlyExpenses([month(0), month(1500), month(2500)])).toBe(2000)
  })

  it('is 0 with no spending at all', () => {
    expect(averageMonthlyExpenses([])).toBe(0)
    expect(averageMonthlyExpenses([month(0), month(0)])).toBe(0)
  })
})

describe('roundUpTo100', () => {
  it('rounds up to the next RM 100', () => {
    expect(roundUpTo100(1234.5)).toBe(1300)
    expect(roundUpTo100(1200.01)).toBe(1300)
  })

  it('leaves exact hundreds alone', () => {
    expect(roundUpTo100(1200)).toBe(1200)
    expect(roundUpTo100(0)).toBe(0)
  })

  it('gives a tidy emergency fund target from an average', () => {
    const average = averageMonthlyExpenses([month(2150.4), month(1890.75), month(2310)])
    expect(roundUpTo100(average * 6)).toBe(12800) // 6 × RM 2,117.05
  })
})
