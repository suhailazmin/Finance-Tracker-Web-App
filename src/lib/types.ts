export type TransactionType = 'income' | 'expense'

export type Category = {
  id: string
  name: string
  type: TransactionType
  color: string | null
}

export type Transaction = {
  id: string
  date: string // yyyy-mm-dd
  description: string
  amount: number // always positive RM; type says direction
  type: TransactionType
  category_id: string | null
  source: string
}

export type TransactionInput = Omit<Transaction, 'id' | 'source'>

export type Budget = {
  id: string
  category_id: string
  month: string // yyyy-mm-01
  limit_amount: number
}

export type SavingsGoal = {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null // yyyy-mm-dd
}

export type SavingsGoalInput = Omit<SavingsGoal, 'id'>

export type CategoryRule = {
  id: string
  keyword: string // matched case-insensitively as whole words
  category_id: string
  priority: number // higher wins
}

export type RecurringTransaction = {
  id: string
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  day_of_month: number // 1-31; 29-31 fall back to the month's last day
  start_month: string // yyyy-MM-01, first month it applies
  last_month: string | null // yyyy-MM-01, last month added or skipped
  auto_add: boolean // false = ask first on the dashboard
  active: boolean // false = paused
}

export type RecurringInput = Omit<RecurringTransaction, 'id' | 'last_month'>
