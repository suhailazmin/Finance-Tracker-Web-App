import { useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Shapes, Trash2 } from 'lucide-react'
import CategoryIcon from '../components/CategoryIcon'
import ColorPicker from '../components/ColorPicker'
import { CATEGORY_COLORS } from '../lib/categoryColors'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { ErrorAlert, FormMessage } from '../components/Feedback'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import SegmentedControl from '../components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { categoryUsage, useCategories, type CategoryInput, type CategoryUsage } from '../hooks/useCategories'
import type { Category, TransactionType } from '../lib/types'
import { toast } from 'sonner'

export default function Categories() {
  const { categories, loaded, error, add, update, remove } = useCategories()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Group your spending and income. Budgets and auto-categorize rules use these categories."
      />
      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SectionCard title="New category" icon={Plus} className="lg:sticky lg:top-24">
          <AddCategoryForm categories={categories} onAdd={add} />
        </SectionCard>

        <div className="grid gap-6">
          {(['expense', 'income'] as const).map((type) => {
            const list = categories.filter((c) => c.type === type)
            return (
              <SectionCard
                key={type}
                title={type === 'expense' ? 'Expense categories' : 'Income categories'}
                description={`${list.length} categor${list.length === 1 ? 'y' : 'ies'}`}
                icon={type === 'expense' ? ArrowUpRight : ArrowDownLeft}
                tone={type === 'expense' ? 'orange' : 'green'}
                contentClassName="px-0"
              >
                {loaded && list.length === 0 ? (
                  <EmptyState title={`No ${type} categories yet`} className="py-4">
                    Add one with the form.
                  </EmptyState>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {list.map((c) => (
                      <CategoryRow
                        key={c.id}
                        category={c}
                        onSave={(input) => update(c.id, input)}
                        onRemove={() => remove(c.id)}
                      />
                    ))}
                  </ul>
                )}
              </SectionCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AddCategoryForm({ categories, onAdd }: { categories: Category[]; onAdd: (input: CategoryInput) => Promise<string | undefined> }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [color, setColor] = useState(CATEGORY_COLORS[4].value)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!clean) return setMessage({ ok: false, text: 'Give the category a name.' })
    if (categories.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      return setMessage({ ok: false, text: `You already have a category called “${clean}”.` })
    }
    setBusy(true)
    const error = await onAdd({ name: clean, type, color })
    setBusy(false)
    if (error) {
      setMessage({ ok: false, text: error })
    } else {
      setMessage(null)
      toast.success('Category added', { description: clean })
      setName('')
    }
  }

  // live preview: the icon comes from the name
  const preview: Category = { id: 'preview', name: name || 'New category', type, color }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SegmentedControl
        label="Category type"
        value={type}
        onChange={setType}
        options={[
          { value: 'expense', label: 'Expense', activeClassName: 'text-brand-orange-ink' },
          { value: 'income', label: 'Income', activeClassName: 'text-primary' },
        ]}
      />
      <Field label="Name" hint="The icon is picked from the name, e.g. “Makan”, “Parking”, “Freelance”.">
        <Input placeholder="e.g. Parking" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
      </Field>
      <div className="grid gap-1.5 text-sm">
        <span className="font-medium leading-none">Colour</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
        <CategoryIcon category={preview} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{preview.name}</p>
          <p className="text-xs text-muted-foreground">Preview · {type === 'expense' ? 'Expense' : 'Income'}</p>
        </div>
      </div>
      <Button type="submit" disabled={busy}>
        <Shapes />
        {busy ? 'Adding…' : 'Add category'}
      </Button>
      {message && <FormMessage ok={message.ok}>{message.text}</FormMessage>}
    </form>
  )
}

type RowProps = {
  category: Category
  onSave: (input: { name: string; color: string }) => Promise<string | undefined>
  onRemove: () => Promise<string | undefined>
}

function CategoryRow({ category, onSave, onRemove }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color ?? CATEGORY_COLORS[12].value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [usage, setUsage] = useState<CategoryUsage | null>(null)

  function startEditing() {
    setName(category.name)
    setColor(category.color ?? CATEGORY_COLORS[12].value)
    setError('')
    setEditing(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!clean) return setError('Give the category a name.')
    setBusy(true)
    const message = await onSave({ name: clean, color })
    setBusy(false)
    if (message) return setError(message)
    setEditing(false)
    toast.success('Category saved', { description: clean })
  }

  function askToDelete() {
    setUsage(null)
    setConfirmOpen(true)
    categoryUsage(category.id).then(setUsage)
  }

  if (editing) {
    return (
      <li className="px-5 py-4">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex items-center gap-3">
            <CategoryIcon category={{ ...category, name: name || category.name, color }} />
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              aria-label="Category name"
              className="flex-1"
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          {error && <FormMessage>{error}</FormMessage>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
      <CategoryIcon category={category} />
      <p className="min-w-0 flex-1 truncate text-sm font-bold">{category.name}</p>
      <div className="flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={startEditing}
          aria-label={`Edit ${category.name}`}
          title="Edit"
          className="text-muted-foreground hover:text-primary"
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={askToDelete}
          aria-label={`Delete ${category.name}`}
          title="Delete"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={Trash2}
        destructive
        title={`Delete “${category.name}”?`}
        description={<UsageSummary usage={usage} />}
        confirmLabel="Delete category"
        onConfirm={onRemove}
      />
    </li>
  )
}

function UsageSummary({ usage }: { usage: CategoryUsage | null }) {
  if (!usage) return <>Checking what uses this category…</>
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (usage.transactions + usage.budgets + usage.rules === 0) return <>Nothing uses this category yet, so it’s safe to delete.</>
  return (
    <span className="block space-y-1 text-left">
      {usage.transactions > 0 && (
        <span className="block">• {plural(usage.transactions, 'transaction')} will become Uncategorized (they’re kept).</span>
      )}
      {usage.budgets > 0 && <span className="block">• {plural(usage.budgets, 'monthly budget')} will be deleted.</span>}
      {usage.rules > 0 && <span className="block">• {plural(usage.rules, 'auto-categorize rule')} will be deleted.</span>}
    </span>
  )
}
