import { useSyncExternalStore } from 'react'

// Light / Dark / System theme. The choice is saved per device; index.html applies it before the
// first paint (no white flash), and this module keeps it in sync afterwards.

export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'monetra:theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

let pref: ThemePref = readPref()

const resolveDark = () => pref === 'dark' || (pref === 'system' && media().matches)

function apply() {
  document.documentElement.classList.toggle('dark', resolveDark())
  listeners.forEach((notify) => notify())
}

document.documentElement.classList.toggle('dark', resolveDark())

// follow the phone/computer setting while on "System"
media().addEventListener('change', () => {
  if (pref === 'system') apply()
})

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // not saved, but applies for this visit
  }
  apply()
}

// read during render by chart colours (see chartTheme.ts)
export const isDark = () => document.documentElement.classList.contains('dark')

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

const snapshot = () => `${pref}|${isDark() ? 'dark' : 'light'}`

// Re-renders the caller when the theme changes
export function useTheme() {
  const [p, mode] = useSyncExternalStore(subscribe, snapshot).split('|')
  return { pref: p as ThemePref, dark: mode === 'dark' }
}
