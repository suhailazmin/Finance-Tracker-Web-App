import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { refreshAll } from './refresh'
import type { Transaction, TransactionInput } from './types'

// Transactions added while offline wait here (on this device) until there's a connection.
// Each gets import_hash "offline:<id>", so a retry after a half-finished sync never adds it twice.

const KEY = 'monetra:outbox'

export type Pending = { id: string; userId: string; createdAt: string; input: TransactionInput }

const listeners = new Set<() => void>()
let cache: Pending[] = read()

function read(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Pending[]
  } catch {
    return []
  }
}

function write(next: Pending[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage full or blocked: the entry stays queued for this visit only
  }
  listeners.forEach((notify) => notify())
}

const currentUserId = async () => (await supabase.auth.getSession()).data.session?.user.id ?? ''

export async function queueTransaction(input: TransactionInput): Promise<Pending> {
  const item: Pending = { id: crypto.randomUUID(), userId: await currentUserId(), createdAt: new Date().toISOString(), input }
  write([...cache, item])
  return item
}

// returns what was removed, so it can be put back (Undo)
export function removePending(id: string): Pending | undefined {
  const item = cache.find((p) => p.id === id)
  write(cache.filter((p) => p.id !== id))
  return item
}

export function restorePending(item: Pending) {
  if (!cache.some((p) => p.id === item.id)) write([...cache, item])
}

// Shown in lists with a "Waiting to sync" label; ids start with "pending:"
export const PENDING_PREFIX = 'pending:'
export const pendingAsTransaction = (p: Pending): Transaction => ({
  id: PENDING_PREFIX + p.id,
  ...p.input,
  source: 'pending',
})

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

// Pending entries for whoever is signed in
export function usePending(userId: string | undefined) {
  const all = useSyncExternalStore(subscribe, () => cache)
  return userId ? all.filter((p) => p.userId === userId) : []
}

let flushing: Promise<number> | null = null

// Sends queued entries; stops at the first network failure and tries again later
export function flushOutbox(): Promise<number> {
  flushing ??= (async () => {
    let sent = 0
    try {
      const userId = await currentUserId()
      for (const item of cache.filter((p) => p.userId === userId)) {
        const { error } = await supabase
          .from('transactions')
          .upsert({ ...item.input, source: 'manual', import_hash: `offline:${item.id}` }, {
            onConflict: 'user_id,import_hash',
            ignoreDuplicates: true,
          })
        if (error) break
        removePending(item.id)
        sent++
      }
      if (sent > 0) await refreshAll()
    } finally {
      flushing = null
    }
    return sent
  })()
  return flushing
}
