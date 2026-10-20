import { useCategories } from '../hooks/useCategories'

// Placeholder until the real dashboard (Feature 2) is built
export default function Dashboard() {
  const { categories, error } = useCategories()

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-lg font-semibold">Your categories</h1>
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
  )
}
