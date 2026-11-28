import { format } from 'date-fns'
import { budgetOutlook, forecastMonth } from './forecast'
import { formatRM } from './format'
import { goalPlan } from './goals'
import { sumRM, toSen } from './money'
import type { Budget, Category, RecurringTransaction, SavingsGoal, Transaction } from './types'

// "Your priorities" on the dashboard: what needs doing this month, most urgent first, each with
// one action. Built only from data Monetra already has; nothing here is a guess about the bank.

export type PriorityTone = 'danger' | 'warning' | 'good'

export type Priority = {
  id: string
  tone: PriorityTone
  title: string
  text: string
  // a page link ("/budgets") or a place on the dashboard ("#due")
  action: { label: string; to: string }
}

export type PriorityInput = {
  today: Date
  income: number // this month
  transactions: Transaction[] // this month
  recurring: RecurringTransaction[]
  budgets: Budget[] // this month
  categories: Category[]
  goals: SavingsGoal[]
  due: { description: string; date: Date }[] // "ask first" recurring items waiting to be confirmed
}

export const MAX_PRIORITIES = 5

const ORDER: Record<PriorityTone, number> = { danger: 0, warning: 1, good: 2 }

// What's left of this month's income after expected spending, rounded down to RM 10 so the
// "safe to save" figure never promises more than the forecast
export const safeToSave = (leftover: number) => Math.max(0, Math.floor(leftover / 10) * 10)

export function buildPriorities(input: PriorityInput): Priority[] {
  const { today, income, transactions, recurring, budgets, categories, goals, due } = input
  const monthParam = format(today, 'yyyy-MM')
  const items: Priority[] = []
  const nameOf = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Category'
  const spendingIn = (categoryId: string) => `/transactions?category=${categoryId}&scope=month&month=${monthParam}`

  // ---- budgets: over first, then heading over; three or more of a kind become one item ----
  const over: { budget: Budget; name: string; spent: number }[] = []
  const heading: { budget: Budget; name: string; projected: number }[] = []
  for (const budget of budgets) {
    const f = forecastMonth(transactions, recurring, today, budget.category_id)
    const outlook = budgetOutlook(f.spent, f.projected, budget.limit_amount)
    const name = nameOf(budget.category_id)
    if (outlook === 'over') over.push({ budget, name, spent: f.spent })
    else if (outlook === 'heading-over') heading.push({ budget, name, projected: f.projected })
  }
  if (over.length > 2) {
    items.push({
      id: 'budgets-over',
      tone: 'danger',
      title: `${over.length} budgets exceeded`,
      text: `${over.map((o) => o.name).join(', ')} are over their limits.`,
      action: { label: 'Review budgets', to: '/budgets' },
    })
  } else {
    for (const { budget, name, spent } of over) {
      items.push({
        id: `budget-over:${budget.id}`,
        tone: 'danger',
        title: `${name} budget exceeded`,
        text: `You’ve gone ${formatRM(sumRM([spent, -budget.limit_amount]))} over your ${formatRM(budget.limit_amount)} ${name} budget.`,
        action: { label: 'Review spending', to: spendingIn(budget.category_id) },
      })
    }
  }
  if (heading.length > 2) {
    items.push({
      id: 'budgets-heading',
      tone: 'warning',
      title: `${heading.length} budgets heading over`,
      text: `At this pace ${heading.map((h) => h.name).join(', ')} will pass their limits by month end.`,
      action: { label: 'Review budgets', to: '/budgets' },
    })
  } else {
    for (const { budget, name, projected } of heading) {
      items.push({
        id: `budget-heading:${budget.id}`,
        tone: 'warning',
        title: `${name} is heading over budget`,
        text: `At this pace you’ll spend about ${formatRM(Math.round(projected))} of your ${formatRM(budget.limit_amount)} limit by month end.`,
        action: { label: 'Review spending', to: spendingIn(budget.category_id) },
      })
    }
  }

  if (budgets.length > 0 && over.length === 0 && heading.length === 0) {
    items.push({
      id: 'budgets-on-track',
      tone: 'good',
      title: budgets.length === 1 ? 'Your budget is on track' : `All ${budgets.length} budgets are on track`,
      text: 'At this pace you’ll stay within every limit this month.',
      action: { label: 'See budgets', to: '/budgets' },
    })
  }

  // ---- the month as a whole ----
  const forecast = forecastMonth(transactions, recurring, today)
  const leftover = income - forecast.projected
  if (income > 0 && toSen(leftover) < 0) {
    items.push({
      id: 'shortfall',
      tone: 'danger',
      title: 'Spending may pass your income',
      text: `At this pace you’ll spend about ${formatRM(Math.round(-leftover))} more than you earned this month.`,
      action: { label: 'See the forecast', to: '#forecast' },
    })
  }

  // ---- recurring items waiting for a yes or no ----
  if (due.length === 1) {
    items.push({
      id: 'due',
      tone: 'warning',
      title: `${due[0].description} is waiting for you`,
      text: `Due ${format(due[0].date, 'd MMM')}. Confirm the amount to add it, or skip this month.`,
      action: { label: 'Review payment', to: '#due' },
    })
  } else if (due.length > 1) {
    items.push({
      id: 'due',
      tone: 'warning',
      title: `${due.length} recurring payments to confirm`,
      text: `${due.map((d) => d.description).join(', ')}. Confirm the amounts to add them, or skip this month.`,
      action: { label: 'Review payments', to: '#due' },
    })
  }

  // ---- goals ----
  for (const goal of goals) {
    if (goalPlan(goal, today).kind === 'overdue') {
      items.push({
        id: `goal-overdue:${goal.id}`,
        tone: 'warning',
        title: `${goal.name}: target date has passed`,
        text: `${formatRM(sumRM([goal.target_amount, -goal.current_amount]))} still to go. Pick a new date or change the target.`,
        action: { label: 'Update goal', to: '/goals' },
      })
    }
  }
  const goalsNeed = sumRM(
    goals.map((g) => {
      const plan = goalPlan(g, today)
      return plan.kind === 'monthly' ? plan.perMonth : 0
    })
  )
  const canSave = income > 0 ? safeToSave(leftover) : 0
  if (goalsNeed > 0 && income > 0 && canSave < goalsNeed) {
    items.push({
      id: 'goals-behind',
      tone: 'warning',
      title: 'Savings goals may fall behind',
      text: `Your goals need about ${formatRM(goalsNeed)} a month, but at this pace only about ${formatRM(canSave)} will be left this month.`,
      action: { label: 'View goals', to: '/goals' },
    })
  }

  // ---- uncategorized spending is left out of every budget ----
  const uncategorized = transactions.filter((t) => t.type === 'expense' && !t.category_id).length
  if (uncategorized > 0) {
    items.push({
      id: 'uncategorized',
      tone: 'warning',
      title: `${uncategorized} expense${uncategorized === 1 ? '' : 's'} without a category`,
      text: `${uncategorized === 1 ? 'It isn’t' : 'They aren’t'} counted in any budget until you pick a category.`,
      action: { label: 'Categorize', to: `/transactions?category=none&scope=month&month=${monthParam}` },
    })
  }

  // ---- good news: how much can safely be saved ----
  if (canSave > 0) {
    const onTrack = goalsNeed > 0 && canSave >= goalsNeed
    items.push({
      id: 'safe-to-save',
      tone: 'good',
      title: `You can safely save about ${formatRM(canSave)}`,
      text: onTrack
        ? `That’s what should be left after expected spending and bills. Your goals need about ${formatRM(goalsNeed)} a month, so you’re on track.`
        : `That’s what should be left this month after expected spending and bills.${forecast.early ? ' A rough estimate this early in the month.' : ''}`,
      action: { label: goals.length ? 'Add to a goal' : 'Start a goal', to: '/goals' },
    })
  }

  // most urgent first; among the good news, "safe to save" leads. The sort is stable, so the
  // order above holds otherwise.
  const lead = (p: Priority) => (p.id === 'safe-to-save' ? 0 : 1)
  return items.sort((a, b) => ORDER[a.tone] - ORDER[b.tone] || (a.tone === 'good' ? lead(a) - lead(b) : 0))
}
