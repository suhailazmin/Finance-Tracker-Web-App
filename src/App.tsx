import { useEffect, useState } from 'react'

type Status =
  | { state: 'checking' }
  | { state: 'ok' }
  | { state: 'error'; message: string }

// Temporary setup check: confirms the keys in .env.local work and the schema exists.
function useSupabaseStatus(): Status {
  const [status, setStatus] = useState<Status>({ state: 'checking' })

  useEffect(() => {
    import('./lib/supabase')
      .then(({ supabase }) =>
        supabase.from('categories').select('id', { count: 'exact', head: true })
      )
      .then(({ error }) =>
        setStatus(error ? { state: 'error', message: error.message } : { state: 'ok' })
      )
      .catch((e: Error) => setStatus({ state: 'error', message: e.message }))
  }, [])

  return status
}

function App() {
  const status = useSupabaseStatus()

  return (
    <main className="min-h-svh bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold">Finance Tracker</h1>
        <p className="mt-2 text-slate-600">Personal finance tracker in RM.</p>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          {status.state === 'checking' && <p>Checking Supabase connection…</p>}
          {status.state === 'ok' && (
            <p className="text-green-700">✅ Connected to Supabase. Database tables found.</p>
          )}
          {status.state === 'error' && (
            <p className="text-red-700">❌ Supabase not ready: {status.message}</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
