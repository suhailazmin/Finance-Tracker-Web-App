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
