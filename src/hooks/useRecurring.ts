import { useEffect, useState } from 'react'
import { addMonths, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { deleteWithUndo } from '../lib/undo'
import { beginLoad, refreshAll, useRefreshVersion } from '../lib/refresh'
import { dueOccurrences, monthKey, recurringHash } from '../lib/recurring'
import type { RecurringInput, RecurringTransaction } from '../lib/types'

const COLUMNS = 'id, description, amount, type, category_id, day_of_month, start_month, last_month, auto_add, active'

// The table is added by supabase/migrations/20261127_recurring_transactions.sql
export const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /recurring_transactions/.test(error.message ?? ''))

export const toRecurring = (r: RecurringTransaction): RecurringTransaction => ({ ...r, amount: Number(r.amount) })

export function useRecurring() {
  const [version, setVersion] = useState(0)
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [missingTable, setMissingTable] = useState(false)
  const refreshVersion = useRefreshVersion()

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('recurring_transactions')
      .select(COLUMNS)
      .order('day_of_month')
      .then(({ data, error }) => {
        done()
        if (ignore) return
        setMissingTable(isMissingTable(error))
        setError(error && !isMissingTable(error) ? error.message : '')
        setItems(((data ?? []) as RecurringTransaction[]).map(toRecurring))
        setLoaded(true)
      })
    return () => {
      ignore = true
      done()
    }
  }, [version, refreshVersion])

  const refresh = () => setVersion((v) => v + 1)
  const result = async (p: PromiseLike<{ error: { message: string } | null }>, thenPostDue = false) => {
    const { error } = await p
    if (error) return error.message
    // e.g. a new item whose day has already passed this month is added straight away
    if (thenPostDue) await postDueRecurring()
    refresh()
    return undefined
  }

  return {
    items,
    loaded,
    error,
    missingTable,
    add: (input: RecurringInput) => result(supabase.from('recurring_transactions').insert(input), true),
    update: (id: string, input: Partial<RecurringInput>) =>
      result(supabase.from('recurring_transactions').update(input).eq('id', id), true),
    // deletes at once; the toast offers Undo (transactions it added are kept either way)
    remove: async (id: string, detail?: string) => {
      const error = await deleteWithUndo('recurring_transactions', id, 'Recurring item deleted', detail)
      if (!error) refresh()
      return error
    },
    // Resuming continues from this month instead of adding every month it was paused
    setActive: (item: RecurringTransaction, active: boolean) =>
      result(
        supabase
          .from('recurring_transactions')
          .update(active ? { active, last_month: maxMonth(item.last_month, monthKey(addMonths(new Date(), -1))) } : { active })
          .eq('id', item.id),
        active
      ),
    // "Ask first" items: add this month's entry (amount may be edited) or skip it
    post: (item: RecurringTransaction, month: Date, date: Date, amount: number) =>
      result(postOccurrence(item, month, date, amount)),
    skip: (item: RecurringTransaction, month: Date) =>
      result(supabase.from('recurring_transactions').update({ last_month: monthKey(month) }).eq('id', item.id)),
  }
}

const maxMonth = (a: string | null, b: string) => (a && a > b ? a : b)

// Adds the transaction for one month and records the month as handled
export async function postOccurrence(item: RecurringTransaction, month: Date, date: Date, amount = item.amount) {
  const insert = await supabase.from('transactions').upsert(
    {
      date: format(date, 'yyyy-MM-dd'),
      description: item.description,
      amount,
      type: item.type,
      category_id: item.category_id,
      source: 'recurring',
      import_hash: recurringHash(item.id, month),
    },
    { onConflict: 'user_id,import_hash', ignoreDuplicates: true }
  )
  if (insert.error) return insert
  return supabase
    .from('recurring_transactions')
    .update({ last_month: maxMonth(item.last_month, monthKey(month)) })
    .eq('id', item.id)
}

// Adds every active "add automatically" item that has come due, including missed months.
// Each month has a unique import_hash, so running this twice (or on two devices) adds nothing extra.
export async function postDueRecurring() {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select(COLUMNS)
    .eq('active', true)
    .eq('auto_add', true)
  if (error) {
    if (!isMissingTable(error)) console.warn('Recurring transactions:', error.message)
    return 0
  }
  let added = 0
  for (const item of ((data ?? []) as RecurringTransaction[]).map(toRecurring)) {
    let current = item
    for (const due of dueOccurrences(item)) {
      const posted = await postOccurrence(current, due.month, due.date)
      if (posted.error) {
        console.warn('Recurring transactions:', posted.error.message)
        break
      }
      current = { ...current, last_month: monthKey(due.month) }
      added++
    }
  }
  // show the new transactions on whatever page is open
  if (added > 0) await refreshAll()
  return added
}
