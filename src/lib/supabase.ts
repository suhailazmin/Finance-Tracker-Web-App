import { createClient } from '@supabase/supabase-js'
import { offlineAwareFetch } from './online'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  )
}

// Use only the origin, so a pasted ".../rest/v1/" URL doesn't break auth requests
// Network failures come back as a friendly "You’re offline: …" message (see lib/online.ts)
export const supabase = createClient(new URL(url).origin, key, { global: { fetch: offlineAwareFetch } })
