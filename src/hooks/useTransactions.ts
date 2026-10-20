import { useEffect, useState } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionInput } from '../lib/types'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

type Result = { key: string; transactions: Transaction[]; error: string }

// Transactions for one calendar month, newest first, plus add/edit/delete
export function useTransactions(month: Date) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result>({ key: '', transactions: [], error: '' })

  const from = ymd(startOfMonth(month))
  const to = ymd(endOfMonth(month))
  const key = `${from}|${version}`

  useEffect(() => {
    let ignore = false
    supabase
      .from('transactions')
      .select('id, date, description, amount, type, category_id, source')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (ignore) return
        setResult({
          key,
          error: error?.message ?? '',
          // numeric columns come back as strings from PostgREST
          transactions: ((data ?? []) as Transaction[]).map((t) => ({ ...t, amount: Number(t.amount) })),
        })
      })
    return () => {
      ignore = true
    }
  }, [from, to, key])

  const refresh = () => setVersion((v) => v + 1)

  async function add(input: TransactionInput) {
    const { error } = await supabase.from('transactions').insert(input)
    if (!error) refresh()
    return error?.message
  }

  async function update(id: string, input: TransactionInput) {
    const { error } = await supabase.from('transactions').update(input).eq('id', id)
    if (!error) refresh()
    return error?.message
  }

  async function remove(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) refresh()
    return error?.message
  }

  return {
    transactions: result.transactions,
    error: result.error,
    loading: result.key !== key,
    add,
    update,
    remove,
  }
}
