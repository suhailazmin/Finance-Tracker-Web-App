import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import type { Category, TransactionType } from '../lib/types'

export type CategoryInput = { name: string; type: TransactionType; color: string }

// What deleting a category would affect
export type CategoryUsage = { transactions: number; budgets: number; rules: number }

// Postgres "unique (user_id, name)" violation -> a message people understand
function friendly(message: string, name: string) {
  return /duplicate key|unique/i.test(message) ? `You already have a category called “${name}”.` : message
}

export function useCategories() {
  const [version, setVersion] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  // reload when the user pulls to refresh
  const refreshVersion = useRefreshVersion()

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('categories')
      .select('id, name, type, color')
      .order('name')
      .then(({ data, error }) => {
        done()
        if (ignore) return
        setError(error?.message ?? '')
        if (!error) setCategories((data ?? []) as Category[])
        setLoaded(true)
      })
    return () => {
      ignore = true
      done()
    }
  }, [version, refreshVersion])

  const refresh = () => setVersion((v) => v + 1)

  async function add(input: CategoryInput) {
    const { error } = await supabase.from('categories').insert(input)
    if (!error) refresh()
    return error ? friendly(error.message, input.name) : undefined
  }

  // The type (income/expense) is fixed after creation: existing transactions depend on it
  async function update(id: string, input: Pick<CategoryInput, 'name' | 'color'>) {
    const { error } = await supabase.from('categories').update(input).eq('id', id)
    if (!error) refresh()
    return error ? friendly(error.message, input.name) : undefined
  }

  // Transactions become Uncategorized; the category's budgets and rules are deleted (see schema.sql)
  async function remove(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) refresh()
    return error?.message
  }

  return { categories, loaded, error, add, update, remove }
}

// Counts shown in the delete confirmation
export async function categoryUsage(id: string): Promise<CategoryUsage> {
  const count = async (table: 'transactions' | 'budgets' | 'category_rules') => {
    const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('category_id', id)
    return count ?? 0
  }
  const [transactions, budgets, rules] = await Promise.all([count('transactions'), count('budgets'), count('category_rules')])
  return { transactions, budgets, rules }
}
