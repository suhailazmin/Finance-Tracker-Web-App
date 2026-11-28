import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteWithUndo } from '../lib/undo'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import type { Transaction, TransactionInput } from '../lib/types'
import { applySearch, type SearchFilters } from '../lib/search'
import { friendlyError } from '../lib/errors'
import { toast } from 'sonner'
import { formatRM } from '../lib/format'

export type { SearchFilters }

export const SEARCH_LIMIT = 300

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
    const query = applySearch(
      supabase.from('transactions').select('id, date, description, amount, type, category_id, source, created_at', { count: 'exact' }),
      { q, category, type, from, to }
    )
    query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT)
      .then(({ data, count, error }) => {
        done()
        if (ignore) return
        setResult({
          key,
          error: friendlyError(error),
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
    if (!error) {
      refresh()
      toast.success('Changes saved', { description: `${formatRM(input.amount)} · ${input.description}` })
    }
    return friendlyError(error) || undefined
  }

  // deletes at once; the toast offers Undo
  async function remove(id: string, detail?: string, title = 'Transaction deleted') {
    const error = await deleteWithUndo('transactions', id, title, detail)
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
