import { useEffect, useState } from 'react'
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'

export type MonthTotal = {
  month: string // yyyy-MM
  income: number
  expenses: number
}

type Result = { key: string; totals: MonthTotal[]; error: string }

// Income and expense totals for the `count` months ending with `month` (oldest first)
export function useMonthlyTotals(month: Date, count = 6) {
  const [result, setResult] = useState<Result>({ key: '', totals: [], error: '' })

  const from = format(startOfMonth(addMonths(month, -(count - 1))), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')
  const key = `${from}|${to}`

  useEffect(() => {
    let ignore = false
    supabase
      .from('transactions')
      .select('date, amount, type')
      .gte('date', from)
      .lte('date', to)
      .then(({ data, error }) => {
        if (ignore) return
        const totals: MonthTotal[] = Array.from({ length: count }, (_, i) => ({
          month: format(addMonths(parseISO(from), i), 'yyyy-MM'),
          income: 0,
          expenses: 0,
        }))
        const byMonth = new Map(totals.map((t) => [t.month, t]))
        for (const row of data ?? []) {
          const bucket = byMonth.get(String(row.date).slice(0, 7))
          if (!bucket) continue
          if (row.type === 'income') bucket.income += Number(row.amount)
          else bucket.expenses += Number(row.amount)
        }
        setResult({ key, totals, error: error?.message ?? '' })
      })
    return () => {
      ignore = true
    }
  }, [from, to, key, count])

  return { totals: result.totals, error: result.error, loading: result.key !== key }
}
