import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useCategoryRules } from '../hooks/useCategoryRules'
import { findRule, normalizeKeyword } from '../lib/categorize'
import { supabase } from '../lib/supabase'
import type { Category, CategoryRule } from '../lib/types'

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'
const button =
  'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60'

type Uncategorized = { id: string; description: string; type: string }

export default function Rules() {
  const { categories } = useCategories()
  const { rules, error, add, remove } = useCategoryRules()
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auto-categorization</h1>
        <p className="mt-1 text-sm text-slate-600">
          When a description contains a keyword, its category is picked for you. Keywords match whole words (so DIGI
          doesn’t match “Digital”) and ignore upper/lower case.
        </p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      <Card title="Try it">
        <RuleTester rules={rules} categoryById={categoryById} />
      </Card>

      <Card title="Add a rule">
        <AddRuleForm rules={rules} categories={categories} onAdd={add} />
      </Card>

      <Card title="Categorize past transactions">
        <ApplyToPast rules={rules} categoryById={categoryById} />
      </Card>

      <Card title={`Your rules (${rules.length})`}>
        <RuleList rules={rules} categories={categories} onRemove={remove} />
      </Card>
    </div>
  )
}

function RuleTester({ rules, categoryById }: { rules: CategoryRule[]; categoryById: Map<string, Category> }) {
  const [text, setText] = useState('')
  const rule = findRule(text, rules)
  const category = rule && categoryById.get(rule.category_id)

  return (
    <>
      <input
        className={field}
        placeholder="Type a description, e.g. GRABFOOD* NASI LEMAK"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text.trim() && (
        <p className="mt-2 text-sm">
          {category ? (
            <>
              → <CategoryName category={category} /> <span className="text-slate-500">(keyword “{rule.keyword}”)</span>
            </>
          ) : (
            <span className="text-slate-500">No rule matches. It would be saved as Uncategorized.</span>
          )}
        </p>
      )}
    </>
  )
}

function AddRuleForm({
  rules,
  categories,
  onAdd,
}: {
  rules: CategoryRule[]
  categories: Category[]
  onAdd: (keyword: string, categoryId: string, priority: number) => Promise<string | undefined>
}) {
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [first, setFirst] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = normalizeKeyword(keyword)
    if (clean.length < 2) return setMessage({ ok: false, text: 'Use a keyword of at least 2 characters.' })
    if (rules.some((r) => r.keyword === clean)) {
      return setMessage({ ok: false, text: `There is already a rule for “${clean}”. Delete it first to change it.` })
    }
    setBusy(true)
    const error = await onAdd(clean, categoryId, first ? 10 : 0)
    setBusy(false)
    if (error) {
      setMessage({ ok: false, text: error })
    } else {
      setMessage({ ok: true, text: `Added “${clean}”.` })
      setKeyword('')
      setFirst(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Keyword</span>
          <input
            className={`${field} mt-1`}
            placeholder="e.g. NASI KANDAR"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={50}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Category</span>
          <select className={`${field} mt-1`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="" disabled>
              Choose…
            </option>
            {(['expense', 'income'] as const).map((type) => (
              <optgroup key={type} label={type === 'expense' ? 'Expenses' : 'Income'}>
                {categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={first} onChange={(e) => setFirst(e.target.checked)} />
        <span>
          Check this rule before others
          <span className="block text-xs text-slate-500">
            For specific keywords that overlap a general one, like GRABFOOD (Food) vs GRAB (Transport).
          </span>
        </span>
      </label>
      <button type="submit" disabled={busy} className={button}>
        {busy ? 'Adding…' : 'Add rule'}
      </button>
      {message && <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>}
    </form>
  )
}

function ApplyToPast({ rules, categoryById }: { rules: CategoryRule[]; categoryById: Map<string, Category> }) {
  const [rows, setRows] = useState<Uncategorized[] | null>(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false
    supabase
      .from('transactions')
      .select('id, description, type')
      .is('category_id', null)
      .then(({ data }) => {
        if (!ignore) setRows((data ?? []) as Uncategorized[])
      })
    return () => {
      ignore = true
    }
  }, [version])

  // Only assign a rule's category when it fits the transaction's type
  const matches = (rows ?? []).flatMap((t) => {
    const rule = findRule(t.description, rules)
    const category = rule && categoryById.get(rule.category_id)
    return category && category.type === t.type ? [{ id: t.id, categoryId: category.id }] : []
  })

  async function apply() {
    setBusy(true)
    const idsByCategory = new Map<string, string[]>()
    for (const m of matches) idsByCategory.set(m.categoryId, [...(idsByCategory.get(m.categoryId) ?? []), m.id])
    let error = ''
    for (const [categoryId, ids] of idsByCategory) {
      const result = await supabase.from('transactions').update({ category_id: categoryId }).in('id', ids)
      if (result.error) error = result.error.message
    }
    setBusy(false)
    setMessage(error || `Categorized ${matches.length} transaction${matches.length === 1 ? '' : 's'}.`)
    setVersion((v) => v + 1)
  }

  if (rows === null) return <p className="text-sm text-slate-500">Checking…</p>

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        {rows.length} uncategorized transaction{rows.length === 1 ? '' : 's'}, of which{' '}
        <strong>{matches.length}</strong> match a rule.
      </p>
      {matches.length > 0 && (
        <button onClick={apply} disabled={busy} className={button}>
          {busy ? 'Updating…' : `Categorize ${matches.length} now`}
        </button>
      )}
      {message && <p className="text-green-700">{message}</p>}
    </div>
  )
}

function RuleList({
  rules,
  categories,
  onRemove,
}: {
  rules: CategoryRule[]
  categories: Category[]
  onRemove: (id: string) => Promise<string | undefined>
}) {
  async function handleRemove(rule: CategoryRule) {
    if (!window.confirm(`Delete the rule “${rule.keyword}”?`)) return
    const error = await onRemove(rule.id)
    if (error) window.alert(error)
  }

  const groups = categories
    .map((c) => ({ category: c, rules: rules.filter((r) => r.category_id === c.id) }))
    .filter((g) => g.rules.length > 0)

  if (groups.length === 0) return <p className="text-sm text-slate-500">No rules yet.</p>

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.category.id}>
          <CategoryName category={g.category} />
          <ul className="mt-2 flex flex-wrap gap-2">
            {g.rules.map((r) => (
              <li key={r.id} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm">
                {r.keyword}
                {r.priority > 0 && (
                  <span className="text-xs text-slate-500" title="Checked before other rules">
                    ↑
                  </span>
                )}
                <button
                  onClick={() => handleRemove(r)}
                  className="ml-1 h-6 w-6 rounded-full text-slate-500 hover:bg-slate-200 hover:text-red-700"
                  aria-label={`Delete rule ${r.keyword}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function CategoryName({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color ?? '#64748b' }} />
      {category.name}
    </span>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}
