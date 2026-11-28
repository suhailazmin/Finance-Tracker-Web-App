import { describe, expect, it } from 'vitest'
import { buildPriorities, safeToSave, type PriorityInput } from './priorities'
import type { Budget, SavingsGoal, Transaction } from './types'

// 15 Nov 2026: 15 days gone, 15 to go, so spending so far doubles by month end
const today = new Date(2026, 10, 15)

const tx = (amount: number, category_id: string | null, extra: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  date: '2026-11-05',
  description: 'Test',
  amount,
  type: 'expense',
  category_id,
  source: 'manual',
  ...extra,
})
const budget = (category_id: string, limit_amount: number): Budget => ({ id: 'b-' + category_id, category_id, month: '2026-11-01', limit_amount })
const goal = (name: string, target: number, saved: number, date: string | null): SavingsGoal => ({
  id: 'g-' + name,
  name,
  target_amount: target,
  current_amount: saved,
  target_date: date,
})
const categories = ['food', 'shopping', 'petrol', 'bills'].map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1), type: 'expense' as const, color: null }))

const build = (over: Partial<PriorityInput>) =>
  buildPriorities({ today, income: 0, transactions: [], recurring: [], budgets: [], categories, goals: [], due: [], ...over })
const ids = (over: Partial<PriorityInput>) => build(over).map((p) => p.id)

describe('budgets', () => {
  it('flags a budget that is already over, with the amount over and a link to its spending', () => {
    const [p] = build({ budgets: [budget('food', 100)], transactions: [tx(150, 'food')] })
    expect(p.tone).toBe('danger')
    expect(p.title).toBe('Food budget exceeded')
    expect(p.text).toContain('50.00 over')
    expect(p.action.to).toBe('/transactions?category=food&scope=month&month=2026-11')
  })

  it('warns when a budget is heading over at this pace', () => {
    // RM 200 in 15 days → about RM 400 by month end, over a RM 300 limit
    const [p] = build({ budgets: [budget('food', 300)], transactions: [tx(200, 'food')] })
    expect(p.tone).toBe('warning')
    expect(p.title).toBe('Food is heading over budget')
    expect(p.text).toContain('400.00')
  })

  it('groups three or more over-budget categories into one item', () => {
    const list = build({
      budgets: [budget('food', 10), budget('shopping', 10), budget('petrol', 10)],
      transactions: [tx(20, 'food'), tx(20, 'shopping'), tx(20, 'petrol')],
    })
    expect(list.map((p) => p.id)).toEqual(['budgets-over'])
    expect(list[0].title).toBe('3 budgets exceeded')
    expect(list[0].text).toBe('Food, Shopping, Petrol are over their limits.')
    expect(list[0].action.to).toBe('/budgets')
  })

  it('says so when every budget is on track', () => {
    const list = build({ budgets: [budget('food', 1000), budget('petrol', 500)], transactions: [tx(100, 'food')] })
    expect(list.find((p) => p.id === 'budgets-on-track')?.title).toBe('All 2 budgets are on track')
  })
})

describe('the month as a whole', () => {
  it('warns when spending is heading past income', () => {
    // RM 800 in 15 days → about RM 1,600 by month end, on RM 1,000 income
    const list = build({ income: 1000, transactions: [tx(800, null)] })
    const p = list.find((x) => x.id === 'shortfall')
    expect(p?.tone).toBe('danger')
    expect(p?.text).toContain('600.00 more than you earned')
    expect(p?.action.to).toBe('#forecast')
    expect(list.some((x) => x.id === 'safe-to-save')).toBe(false)
  })

  it('says how much can safely be saved, rounded down to RM 10', () => {
    // RM 1,000 in 15 days → RM 2,000 by month end; RM 4,567 income leaves RM 2,567 → RM 2,560
    const p = build({ income: 4567, transactions: [tx(1000, 'food')] }).find((x) => x.id === 'safe-to-save')
    expect(p?.tone).toBe('good')
    expect(p?.title).toContain('2,560.00')
    expect(p?.action).toEqual({ label: 'Start a goal', to: '/goals' })
  })

  it('makes no promises without income', () => {
    expect(ids({ income: 0, transactions: [tx(50, 'food')] })).not.toContain('safe-to-save')
    expect(ids({ income: 0, transactions: [tx(50, 'food')] })).not.toContain('shortfall')
  })
})

describe('recurring payments to confirm', () => {
  it('names a single payment and its due date', () => {
    const [p] = build({ due: [{ description: 'TNB electricity', date: new Date(2026, 10, 12) }] })
    expect(p.title).toBe('TNB electricity is waiting for you')
    expect(p.text).toContain('Due 12 Nov')
    expect(p.action.to).toBe('#due')
  })

  it('counts several', () => {
    const [p] = build({
      due: [
        { description: 'TNB', date: new Date(2026, 10, 12) },
        { description: 'Air Selangor', date: new Date(2026, 10, 14) },
      ],
    })
    expect(p.title).toBe('2 recurring payments to confirm')
    expect(p.text).toContain('TNB, Air Selangor')
  })
})

describe('savings goals', () => {
  it('flags a goal whose date has passed', () => {
    const [p] = build({ goals: [goal('Raya trip', 3000, 1000, '2026-11-01')] })
    expect(p.id).toBe('goal-overdue:g-Raya trip')
    expect(p.text).toContain('2,000.00 still to go')
  })

  it('warns when what can be saved is less than the goals need', () => {
    // RM 1,000 in 15 days → RM 2,000 by month end, so RM 1,000 can be saved; the laptop needs RM 1,500 a month
    const list = build({ income: 3000, transactions: [tx(1000, 'food')], goals: [goal('Laptop', 3000, 0, '2027-01-15')] })
    const p = list.find((x) => x.id === 'goals-behind')
    expect(p?.tone).toBe('warning')
    expect(p?.text).toContain('1,500.00 a month')
  })

  it('says the goals are on track when there is enough left', () => {
    const list = build({ income: 3000, transactions: [tx(500, 'food')], goals: [goal('Laptop', 1000, 0, '2027-01-15')] })
    expect(list.some((x) => x.id === 'goals-behind')).toBe(false)
    expect(list.find((x) => x.id === 'safe-to-save')?.text).toContain('so you’re on track')
  })
})

describe('uncategorized spending', () => {
  it('counts expenses without a category and links to them', () => {
    const [p] = build({ transactions: [tx(10, null), tx(20, null), tx(30, 'food'), tx(99, null, { type: 'income' })] })
    expect(p.title).toBe('2 expenses without a category')
    expect(p.action.to).toBe('/transactions?category=none&scope=month&month=2026-11')
  })
})

describe('order', () => {
  it('puts what needs action first, then things worth a look, then good news', () => {
    const list = build({
      income: 5000,
      budgets: [budget('food', 100)],
      transactions: [tx(150, 'food'), tx(10, null)],
      due: [{ description: 'TNB', date: new Date(2026, 10, 12) }],
    })
    expect(list.map((p) => p.tone)).toEqual(['danger', 'warning', 'warning', 'good'])
    expect(list[0].id).toBe('budget-over:b-food')
    expect(list.at(-1)?.id).toBe('safe-to-save')
  })

  it('leads the good news with how much can be saved', () => {
    const list = build({ income: 5000, budgets: [budget('food', 1000)], transactions: [tx(100, 'food')] })
    expect(list.map((p) => p.id)).toEqual(['safe-to-save', 'budgets-on-track'])
  })

  it('is empty when there is nothing to say', () => {
    expect(build({})).toEqual([])
  })
})

describe('safeToSave', () => {
  it('rounds down to RM 10 and never goes below zero', () => {
    expect(safeToSave(2567.4)).toBe(2560)
    expect(safeToSave(9.99)).toBe(0)
    expect(safeToSave(-300)).toBe(0)
  })
})
