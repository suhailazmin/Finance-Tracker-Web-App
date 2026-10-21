import { useEffect, useState } from 'react'
import { addMonths, format, startOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { Budget } from '../lib/types'

const monthKey = (d: Date) => format(startOfMonth(d), 'yyyy-MM-dd')

type Result = { key: string; budgets: Budget[]; error: string }

// Spending limits for one month, plus set/remove/copy-from-last-month
export function useBudgets(month: Date) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result>({ key: '', budgets: [], error: '' })

  const current = monthKey(month)
  const key = `${current}|${version}`

  useEffect(() => {
    let ignore = false
    supabase
      .from('budgets')
      .select('id, category_id, month, limit_amount')
      .eq('month', current)
      .then(({ data, error }) => {
        if (ignore) return
        setResult({
          key,
          error: error?.message ?? '',
          // numeric columns come back as strings from PostgREST
          budgets: ((data ?? []) as Budget[]).map((b) => ({ ...b, limit_amount: Number(b.limit_amount) })),
        })
      })
    return () => {
      ignore = true
    }
  }, [current, key])

  const refresh = () => setVersion((v) => v + 1)

  async function set(categoryId: string, limit: number) {
    const { error } = await supabase
      .from('budgets')
      .upsert(
        { category_id: categoryId, month: current, limit_amount: limit },
        { onConflict: 'user_id,category_id,month' }
      )
    if (!error) refresh()
    return error?.message
  }

  async function remove(id: string) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) refresh()
    return error?.message
  }

  // Copies last month's limits into this month; existing limits are kept
  async function copyFromPreviousMonth() {
    const previous = monthKey(addMonths(month, -1))
    const { data, error } = await supabase
      .from('budgets')
      .select('category_id, limit_amount')
      .eq('month', previous)
    if (error) return { error: error.message, copied: 0 }
    if (!data?.length) return { error: '', copied: 0 }

    const insert = await supabase.from('budgets').upsert(
      data.map((b) => ({ category_id: b.category_id, limit_amount: b.limit_amount, month: current })),
      { onConflict: 'user_id,category_id,month', ignoreDuplicates: true }
    )
    if (!insert.error) refresh()
    return { error: insert.error?.message ?? '', copied: data.length }
  }

  return {
    budgets: result.budgets,
    error: result.error,
    loading: result.key !== key,
    set,
    remove,
    copyFromPreviousMonth,
  }
}
