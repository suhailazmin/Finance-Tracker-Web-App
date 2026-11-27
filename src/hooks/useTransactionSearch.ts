import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteWithUndo } from '../lib/undo'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import type { Transaction, TransactionInput, TransactionType } from '../lib/types'

export type SearchFilters = {
  q: string // matched anywhere in the description, any case
  category: string // '' = any, 'none' = Uncategorized, otherwise a category id
  type: '' | TransactionType
  from?: string // yyyy-MM-dd, inclusive
  to?: string
}

export const SEARCH_LIMIT = 300

// "%" and "_" are wildcards in LIKE patterns; escape them so they're searched literally
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

type Result = { key: string; transactions: Transaction[]; count: number; error: string }

// Transactions matching the filters across any months, newest first (up to SEARCH_LIMIT)
export function useTransactionSearch(filters: SearchFilters, enabled: boolean) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result>({ key: '', transactions: [], count: 0, error: '' })
  const refreshVersion = useRefreshVersion()

  // wait for a pause in typing before querying; clearing the box applies straight away
  const [typed, setTyped] = useState(filters.q.trim())
  useEffect(() => {
    const id = window.setTimeout(() => setTyped(filters.q.trim()), 300)
    return () => window.clearTimeout(id)
  }, [filters.q])
  const q = filters.q.trim() ? typed : ''

  const { category, type, from, to } = filters
  const key = JSON.stringify({ q, category, type, from, to, version })

  useEffect(() => {
    if (!enabled) return
    let ignore = false
    const done = beginLoad()
    let query = supabase
      .from('transactions')
      .select('id, date, description, amount, type, category_id, source', { count: 'exact' })
    if (q) query = query.ilike('description', `%${likeEscape(q)}%`)
    if (category === 'none') query = query.is('category_id', null)
    else if (category) query = query.eq('category_id', category)
    if (type) query = query.eq('type', type)
    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)
    query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT)
      .then(({ data, count, error }) => {
        done()
        if (ignore) return
        setResult({
          key,
          error: error?.message ?? '',
          count: count ?? 0,
          // numeric columns come back as strings from PostgREST
          transactions: ((data ?? []) as Transaction[]).map((t) => ({ ...t, amount: Number(t.amount) })),
        })
      })
    return () => {
      ignore = true
      done()
    }
  }, [enabled, key, q, category, type, from, to, refreshVersion])

  const refresh = () => setVersion((v) => v + 1)

  async function update(id: string, input: TransactionInput) {
    const { error } = await supabase.from('transactions').update(input).eq('id', id)
    if (!error) refresh()
    return error?.message
  }

  // deletes at once; the toast offers Undo
  async function remove(id: string, detail?: string) {
    const error = await deleteWithUndo('transactions', id, 'Transaction deleted', detail)
    if (!error) refresh()
    return error
  }

  return {
    transactions: result.transactions,
    count: result.count,
    error: result.error,
    // also true while the user is still typing
    loading: result.key !== key || q !== filters.q.trim(),
    update,
    remove,
  }
}
