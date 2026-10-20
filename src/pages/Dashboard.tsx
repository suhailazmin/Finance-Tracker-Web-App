import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

type Category = { id: string; name: string; type: string; color: string | null }

// Placeholder until the real dashboard is built: shows the default
// categories Supabase created for this user, proving login + RLS work.
export default function Dashboard() {
  const { session } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, type, color')
      .order('type')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCategories(data ?? [])
      })
  }, [])

  return (
    <main className="min-h-svh bg-slate-50 text-slate-900 p-4">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-4 py-4">
          <div>
            <h1 className="text-2xl font-semibold">Finance Tracker</h1>
            <p className="text-sm text-slate-600">{session?.user.email}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Sign out
          </button>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold">Your categories</h2>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="rounded-full px-3 py-1 text-sm text-white"
                style={{ backgroundColor: c.color ?? '#64748b' }}
              >
                {c.name}
              </li>
            ))}
          </ul>
          {!error && categories.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">No categories yet.</p>
          )}
        </section>
      </div>
    </main>
  )
}
