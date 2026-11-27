import { postDueRecurring } from '../hooks/useRecurring'

let started = false

// Adds every "add automatically" item that has come due (including missed months), once per
// app launch. Safe to run on several devices at once: each month has a unique import_hash.
export function runRecurringOnce() {
  if (started) return
  started = true
  return postDueRecurring()
}
