import { useSyncExternalStore } from 'react'

// App-wide "reload your data" signal for pull-to-refresh.
// Data hooks add useRefreshVersion() to their effect dependencies (so they refetch, keeping
// the old data on screen meanwhile) and wrap each request in beginLoad() so refreshAll()
// knows when everything has come back.

let version = 0
let pending = 0
const listeners = new Set<() => void>()
let idleWaiters: (() => void)[] = []

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

export function useRefreshVersion() {
  return useSyncExternalStore(subscribe, () => version)
}

// Call when a request starts; call the returned function when it ends (safe to call twice)
export function beginLoad() {
  pending++
  let ended = false
  return () => {
    if (ended) return
    ended = true
    pending--
    if (pending === 0) {
      const waiters = idleWaiters
      idleWaiters = []
      waiters.forEach((resolve) => resolve())
    }
  }
}

// Ask every mounted data hook to reload; resolves when all their requests have finished
export function refreshAll(): Promise<void> {
  version++
  listeners.forEach((notify) => notify())
  return new Promise((resolve) => {
    // give React a moment to re-render and start the new requests
    window.setTimeout(() => {
      if (pending === 0) return resolve()
      idleWaiters.push(resolve)
      window.setTimeout(resolve, 10000) // never spin forever on a slow network
    }, 60)
  })
}
