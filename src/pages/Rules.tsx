import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUp, FlaskConical, History, ListChecks, Plus, WandSparkles, X } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { ErrorAlert, FormMessage } from '../components/Feedback'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { useCategories } from '../hooks/useCategories'
import { useCategoryRules } from '../hooks/useCategoryRules'
import { findRule, normalizeKeyword } from '../lib/categorize'
import { supabase } from '../lib/supabase'
import { beginLoad, useRefreshVersion } from '../lib/refresh'
import type { Category, CategoryRule } from '../lib/types'
import { friendlyError } from '../lib/errors'
import { toast } from 'sonner'

type Uncategorized = { id: string; description: string; type: string }

export default function Rules() {
  const { categories } = useCategories()
  const { rules, error, add, remove } = useCategoryRules()
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto-categorize"
        description={
          <>
            When a description contains a keyword, its category is picked for you. Keywords match whole words (so DIGI
            doesn’t match “Digital”) and ignore upper/lower case.
          </>
        }
      />
      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Add a rule" icon={Plus}>
          <AddRuleForm rules={rules} categories={categories} onAdd={add} />
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard title="Try it" description="See which rule a description would match" icon={FlaskConical} tone="orange">
            <RuleTester rules={rules} categoryById={categoryById} />
          </SectionCard>
          <SectionCard title="Categorize past transactions" icon={History} tone="orange">
            <ApplyToPast rules={rules} categoryById={categoryById} />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Your rules" icon={ListChecks} actions={<Badge variant="secondary">{rules.length}</Badge>}>
        <RuleList rules={rules} categories={categories} onRemove={remove} />
      </SectionCard>
    </div>
  )
}

function RuleTester({ rules, categoryById }: { rules: CategoryRule[]; categoryById: Map<string, Category> }) {
  const [text, setText] = useState('')
  const rule = findRule(text, rules)
  const category = rule && categoryById.get(rule.category_id)

  return (
    <>
      <Input
        placeholder="Type a description, e.g. GRABFOOD* NASI LEMAK"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Description to test"
      />
      {text.trim() && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm" aria-live="polite">
          {category ? (
            <>
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              <CategoryName category={category} />
              <span className="text-muted-foreground">(keyword “{rule.keyword}”)</span>
            </>
          ) : (
            <span className="text-muted-foreground">No rule matches. It would be saved as Uncategorized.</span>
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
      setMessage(null)
      toast.success('Rule added', { description: `${clean} → ${categories.find((c) => c.id === categoryId)?.name ?? 'category'}` })
      setKeyword('')
      setFirst(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Keyword">
          <Input
            placeholder="e.g. NASI KANDAR"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={50}
            required
          />
        </Field>
        <Field label="Category">
          <NativeSelect className="w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <NativeSelectOption value="" disabled>
              Choose…
            </NativeSelectOption>
            {(['expense', 'income'] as const).map((type) => (
              <NativeSelectOptGroup key={type} label={type === 'expense' ? 'Expenses' : 'Income'}>
                {categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox className="mt-0.5" checked={first} onCheckedChange={(v) => setFirst(v === true)} />
        <span>
          Check this rule before others
          <span className="block text-xs text-muted-foreground">
            For specific keywords that overlap a general one, like GRABFOOD (Food) vs GRAB (Transport).
          </span>
        </span>
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? 'Adding…' : 'Add rule'}
      </Button>
      {message && <FormMessage ok={message.ok}>{message.text}</FormMessage>}
    </form>
  )
}

function ApplyToPast({ rules, categoryById }: { rules: CategoryRule[]; categoryById: Map<string, Category> }) {
  const [rows, setRows] = useState<Uncategorized[] | null>(null)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  // reload when the user pulls to refresh
  const refreshVersion = useRefreshVersion()

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('transactions')
      .select('id, description, type')
      .is('category_id', null)
      .then(({ data }) => {
        done()
        if (!ignore) setRows((data ?? []) as Uncategorized[])
      })
    return () => {
      ignore = true
      done()
    }
  }, [version, refreshVersion])

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
      if (result.error) error = friendlyError(result.error)
    }
    setBusy(false)
    setMessage(error)
    if (!error) toast.success(`Categorized ${matches.length} transaction${matches.length === 1 ? '' : 's'}`)
    setVersion((v) => v + 1)
  }

  if (rows === null) return <p className="text-sm text-muted-foreground">Checking…</p>

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        {rows.length} uncategorized transaction{rows.length === 1 ? '' : 's'}, of which{' '}
        <strong className="text-foreground">{matches.length}</strong> match a rule.
      </p>
      {matches.length > 0 && (
        <ConfirmDialog
          trigger={<Button disabled={busy}>{busy ? 'Updating…' : `Categorize ${matches.length} now`}</Button>}
          icon={WandSparkles}
          title={`Categorize ${matches.length} transaction${matches.length === 1 ? '' : 's'}?`}
          description="Each matching uncategorized transaction gets the category from its rule. You can still change any of them afterwards."
          confirmLabel="Categorize"
          onConfirm={apply}
        />
      )}
      {message && <FormMessage>{message}</FormMessage>}
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
  onRemove: (id: string, detail?: string) => Promise<string | undefined>
}) {
  const groups = categories
    .map((c) => ({ category: c, rules: rules.filter((r) => r.category_id === c.id) }))
    .filter((g) => g.rules.length > 0)

  if (groups.length === 0) return <p className="text-sm text-muted-foreground">No rules yet.</p>

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.category.id}>
          <CategoryName category={g.category} />
          <ul className="mt-2 flex flex-wrap gap-2">
            {g.rules.map((r) => (
              <li key={r.id} className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-0.5 pl-3 text-sm">
                {r.keyword}
                {r.priority > 0 && (
                  <ArrowUp className="size-3.5 text-muted-foreground" aria-label="Checked before other rules">
                    <title>Checked before other rules</title>
                  </ArrowUp>
                )}
                <Button
                  onClick={() => onRemove(r.id, `${r.keyword} → ${g.category.name}`)}
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete rule ${r.keyword}`}
                >
                  <X />
                </Button>
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
