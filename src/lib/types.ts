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
