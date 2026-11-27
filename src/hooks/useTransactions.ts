import { useEffect, useState } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { isOfflineError } from '../lib/online'
import { PENDING_PREFIX, pendingAsTransaction, queueTransaction, removePending, usePending } from '../lib/outbox'
import { deleteWithUndo } from '../lib/undo'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import type { Transaction, TransactionInput } from '../lib/types'
import { friendlyError } from '../lib/errors'
import { formatRM } from '../lib/format'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

type Result = { key: string; transactions: Transaction[]; error: string }

// Transactions for one calendar month, newest first, plus add/edit/delete
export function useTransactions(month: Date) {
  // reload when the user pulls to refresh
  const refreshVersion = useRefreshVersion()
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result>({ key: '', transactions: [], error: '' })

  const from = ymd(startOfMonth(month))
  const to = ymd(endOfMonth(month))
  const key = `${from}|${version}`

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('transactions')
      .select('id, date, description, amount, type, category_id, source')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        done()
        if (ignore) return
        setResult({
          key,
          error: friendlyError(error),
          // numeric columns come back as strings from PostgREST
          transactions: ((data ?? []) as Transaction[]).map((t) => ({ ...t, amount: Number(t.amount) })),
        })
      })
    return () => {
      ignore = true
      done()
    }
  }, [from, to, key, refreshVersion])

  const refresh = () => setVersion((v) => v + 1)

  async function add(input: TransactionInput) {
    const { error } = await supabase.from('transactions').insert(input)
    if (error && isOfflineError(error)) {
      // no connection: keep it on this device and send it when we're back online
      await queueTransaction(input)
      toast('Saved on this device', { description: 'It will be added to Monetra when you’re back online.' })
      return undefined
    }
    if (!error) {
      refresh()
      toast.success(`${input.type === 'income' ? 'Income' : 'Expense'} added`, { description: `${formatRM(input.amount)} · ${input.description}` })
    }
    return friendlyError(error) || undefined
  }

  async function update(id: string, input: TransactionInput) {
    const { error } = await supabase.from('transactions').update(input).eq('id', id)
    if (!error) {
      refresh()
      toast.success('Changes saved', { description: `${formatRM(input.amount)} · ${input.description}` })
    }
    return friendlyError(error) || undefined
  }

  // deletes at once; the toast offers Undo
  async function remove(id: string, detail?: string) {
    if (id.startsWith(PENDING_PREFIX)) {
      removePending(id.slice(PENDING_PREFIX.length)) // not sent yet: just drop it from the queue
      return undefined
    }
    const error = await deleteWithUndo('transactions', id, 'Transaction deleted', detail)
    if (!error) refresh()
    return error
  }

  // entries added offline for this month, shown with "Waiting to sync"
  const { session } = useAuth()
  const queued = usePending(session?.user.id)
    .filter((p) => p.input.date >= from && p.input.date <= to)
    .map(pendingAsTransaction)
  const transactions = queued.length
    ? [...queued, ...result.transactions].sort((a, b) => b.date.localeCompare(a.date))
    : result.transactions

  return {
    transactions,
    error: result.error,
    loading: result.key !== key,
    add,
    update,
    remove,
  }
}
