import { useSyncExternalStore } from 'react'

// "Hide amounts" privacy mode: when on, every RM figure renders as "RM ••••".
// Remembered per device, so the app opens hidden next time if you left it hidden.

const KEY = 'monetra:hide-amounts'
const listeners = new Set<() => void>()

function readSaved() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false // private mode or blocked storage: start visible
  }
}

let hidden = readSaved()

export const amountsHidden = () => hidden

export function setAmountsHidden(next: boolean) {
  hidden = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    // not saved, but the toggle still works for this visit
  }
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

// Re-renders the caller whenever the setting changes
export function useAmountsHidden() {
  return useSyncExternalStore(subscribe, amountsHidden)
}
