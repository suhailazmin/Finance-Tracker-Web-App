import { useSyncExternalStore } from 'react'

// Network status for the offline badge and for deciding when to queue new transactions

function subscribe(notify: () => void) {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
  return () => {
    window.removeEventListener('online', notify)
    window.removeEventListener('offline', notify)
  }
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine)
}

// Supabase reports a failed request as "<error name>: <message>", so naming the error like a
// sentence gives every form and toast the same readable text: "You’re offline: try again …"
export const OFFLINE_NAME = 'You’re offline'

class OfflineError extends Error {
  name = OFFLINE_NAME
  constructor() {
    super('try again when you’re connected.')
  }
}

// fetch for the Supabase client: turns "Failed to fetch" / "Load failed" into OfflineError
export const offlineAwareFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    if (!navigator.onLine || e instanceof TypeError) throw new OfflineError()
    throw e
  }
}

export const isOfflineError = (error: { message?: string } | null | undefined) =>
  !!error && (error.message?.startsWith(OFFLINE_NAME) || !navigator.onLine)
