import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

// Service worker (built by vite-plugin-pwa, see vite.config.ts):
// - keeps the app's files on the device, so Monetra opens instantly and works offline
// - keeps the last-loaded copy of your data (cache "monetra-data") to show when offline

export const DATA_CACHE = 'monetra-data'
const OWNER_KEY = 'monetra:data-owner'

export function startServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  const update = registerSW({
    // a new version was deployed: let the person reload when it suits them
    onNeedRefresh() {
      toast('A new version of Monetra is ready', {
        duration: Infinity,
        action: { label: 'Reload', onClick: () => void update(true) },
      })
    },
    onOfflineReady() {
      toast.success('Monetra now works offline')
    },
  })
}

// Signing out removes the saved copy of the data, so a shared device shows nothing
export async function clearCachedData() {
  try {
    localStorage.removeItem(OWNER_KEY)
  } catch {
    // ignore
  }
  if ('caches' in window) await caches.delete(DATA_CACHE)
}

// If someone else signs in on this device, drop the previous person's saved data first
export async function forgetOtherUsersData(userId: string) {
  let owner: string | null = null
  try {
    owner = localStorage.getItem(OWNER_KEY)
    localStorage.setItem(OWNER_KEY, userId)
  } catch {
    // storage blocked: nothing was saved under another owner either
  }
  if (owner && owner !== userId && 'caches' in window) await caches.delete(DATA_CACHE)
}
