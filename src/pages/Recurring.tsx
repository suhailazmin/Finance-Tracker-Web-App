import { useState, type FormEvent } from 'react'
import { addMonths, format, isAfter, startOfDay, startOfMonth } from 'date-fns'
import { Check, Copy, DatabaseZap, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import CategoryIcon from '../components/CategoryIcon'
import EmptyState from '../components/EmptyState'
import { ErrorAlert, FormMessage } from '../components/Feedback'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import SegmentedControl from '../components/SegmentedControl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { useCategories } from '../hooks/useCategories'
import { useCategoryRules } from '../hooks/useCategoryRules'
import { useRecurring } from '../hooks/useRecurring'
import { findRule } from '../lib/categorize'
import { formatRM } from '../lib/format'
import { monthKey, nextOccurrence, occurrenceIn, ordinal } from '../lib/recurring'
import type { Category, CategoryRule, RecurringInput, RecurringTransaction, TransactionType } from '../lib/types'
import migrationSql from '../../supabase/migrations/20261127_recurring_transactions.sql?raw'

// Positive RM amount with at most 2 decimal places
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

export default function Recurring() {
  const { categories } = useCategories()
  const { rules } = useCategoryRules()
  const { items, loaded, error, missingTable, add, update, remove, setActive } = useRecurring()

  const monthly = (type: TransactionType) =>
    items.filter((i) => i.active && i.type === type).reduce((sum, i) => sum + i.amount, 0)
  const moneyIn = monthly('income')
  const moneyOut = monthly('expense')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring"
        description="Salary, rent and bills that repeat every month. Monetra adds them for you, or asks first."
      />
      {error && <ErrorAlert message={error} />}

      {missingTable ? (
        <SetupNotice />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <SectionCard title="New recurring item" icon={Plus} className="lg:sticky lg:top-24">
            <RecurringForm categories={categories} rules={rules} onSubmit={add} />
          </SectionCard>

          <div className="space-y-4">
            {items.some((i) => i.active) && (
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="In each month" value={formatRM(moneyIn)} />
                <MiniStat label="Out each month" value={formatRM(moneyOut)} />
                <MiniStat label="Left over" value={formatRM(moneyIn - moneyOut)} />
              </div>
            )}
            <Card className="gap-0 py-0">
              <div className="flex items-center gap-3 border-b px-5 py-4">
                <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Repeat className="size-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Every month</h2>
                  <p className="text-sm text-muted-foreground">
                    {items.length} item{items.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {loaded && items.length === 0 ? (
                <EmptyState title="Nothing recurring yet">
                  Add your salary, rent, Unifi or phone bill and it will be entered every month.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-border/70">
                  {items.map((item) => (
                    <RecurringRow
                      key={item.id}
                      item={item}
                      categories={categories}
                      rules={rules}
                      onUpdate={(input) => update(item.id, input)}
                      onRemove={() => remove(item.id, item.description)}
                      onToggle={() => setActive(item, !item.active)}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm" className="gap-1 px-3 sm:px-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm font-extrabold tracking-tight sm:text-lg">{value}</p>
    </Card>
  )
}

// ---------- add / edit form ----------

type FormProps = {
  categories: Category[]
  rules: CategoryRule[]
  initial?: RecurringTransaction
  onSubmit: (input: RecurringInput) => Promise<string | undefined>
  onCancel?: () => void
}

function RecurringForm({ categories, rules, initial, onSubmit, onCancel }: FormProps) {
  const [today] = useState(() => startOfDay(new Date()))
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? initial.amount.toFixed(2) : '')
  const [chosenCategory, setChosenCategory] = useState<string | null>(initial ? (initial.category_id ?? '') : null)
  const [day, setDay] = useState(initial?.day_of_month ?? today.getDate())
  const [autoAdd, setAutoAdd] = useState(initial?.auto_add ?? true)
  const [startThisMonth, setStartThisMonth] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const options = categories.filter((c) => c.type === type)
  const rule = findRule(description, rules)
  const autoCategory = rule && options.some((c) => c.id === rule.category_id) ? rule.category_id : ''
  const categoryId = chosenCategory ?? autoCategory

  const thisMonthDate = occurrenceIn(today, day)
  const nextMonthDate = occurrenceIn(addMonths(today, 1), day)
  const thisMonthPassed = !isAfter(thisMonthDate, today)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = amount.trim().replace(/,/g, '')
    if (!description.trim()) return setMessage({ ok: false, text: 'Add a description, e.g. Unifi.' })
    if (!AMOUNT_PATTERN.test(clean) || Number(clean) <= 0) {
      return setMessage({ ok: false, text: 'Enter an amount above RM 0 with at most 2 decimal places.' })
    }
    setBusy(true)
    const error = await onSubmit({
      description: description.trim(),
      amount: Number(clean),
      type,
      category_id: categoryId || null,
      day_of_month: day,
      auto_add: autoAdd,
      active: initial?.active ?? true,
      start_month: initial?.start_month ?? monthKey(startThisMonth ? today : addMonths(startOfMonth(today), 1)),
    })
    setBusy(false)
    if (error) return setMessage({ ok: false, text: error })
    if (!initial) {
      const addedNow = autoAdd && startThisMonth && thisMonthPassed
      setMessage({
        ok: true,
        text: addedNow
          ? `Added “${description.trim()}”, including this month’s entry on ${format(thisMonthDate, 'd MMM')}.`
          : `Added “${description.trim()}”.`,
      })
      setDescription('')
      setAmount('')
      setChosenCategory(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SegmentedControl
        label="Type"
        value={type}
        onChange={(t: TransactionType) => {
          setType(t)
          if (!categories.some((c) => c.id === chosenCategory && c.type === t)) setChosenCategory(null)
        }}
        options={[
          { value: 'expense', label: 'Bill / expense', activeClassName: 'text-destructive' },
          { value: 'income', label: 'Income', activeClassName: 'text-primary' },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Description">
          <Input
            placeholder={type === 'expense' ? 'e.g. Unifi' : 'e.g. Salary'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            required
          />
        </Field>
        <Field label="Amount (RM)" hint={!autoAdd ? 'A typical amount; you can change it each month.' : undefined}>
          <Input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Category" hint={chosenCategory === null && autoCategory ? '✨ Picked from your rules' : undefined}>
          <NativeSelect className="w-full" value={categoryId} onChange={(e) => setChosenCategory(e.target.value)}>
            <NativeSelectOption value="">Uncategorized</NativeSelectOption>
            {options.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Day of the month" hint={day > 28 ? 'In shorter months it uses the last day.' : undefined}>
          <NativeSelect className="w-full" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <NativeSelectOption key={d} value={d}>
                {ordinal(d)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">When it’s due</p>
        <SegmentedControl
          label="When it's due"
          value={autoAdd ? 'auto' : 'ask'}
          onChange={(v) => setAutoAdd(v === 'auto')}
          options={[
            { value: 'auto', label: 'Add automatically' },
            { value: 'ask', label: 'Ask me first' },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {autoAdd
            ? 'Best for fixed amounts like salary, rent or Unifi.'
            : 'Shows on your dashboard to confirm the amount; best for bills that change, like TNB.'}
        </p>
      </div>

      {!initial && (
        <Field label="Starting">
          <NativeSelect className="w-full" value={startThisMonth ? 'this' : 'next'} onChange={(e) => setStartThisMonth(e.target.value === 'this')}>
            <NativeSelectOption value="this">
              This month, {format(thisMonthDate, 'd MMM')}
              {thisMonthPassed ? (autoAdd ? ' (added now)' : ' (asks now)') : ''}
            </NativeSelectOption>
            <NativeSelectOption value="next">Next month, {format(nextMonthDate, 'd MMM')}</NativeSelectOption>
          </NativeSelect>
          {autoAdd && startThisMonth && thisMonthPassed && (
            <span className="text-xs text-brand-orange-ink">
              Already entered this month’s one yourself? Choose next month so it isn’t added twice.
            </span>
          )}
        </Field>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {initial ? <Check /> : <Repeat />}
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Add recurring item'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {message && <FormMessage ok={message.ok}>{message.text}</FormMessage>}
    </form>
  )
}

// ---------- list row ----------

type RowProps = {
  item: RecurringTransaction
  categories: Category[]
  rules: CategoryRule[]
  onUpdate: (input: Partial<RecurringInput>) => Promise<string | undefined>
  onRemove: () => Promise<string | undefined>
  onToggle: () => Promise<string | undefined>
}

function RecurringRow({ item, categories, rules, onUpdate, onRemove, onToggle }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const category = categories.find((c) => c.id === item.category_id)

  if (editing) {
    return (
      <li className="p-5">
        <RecurringForm
          categories={categories}
          rules={rules}
          initial={item}
          onSubmit={async (input) => {
            const error = await onUpdate(input)
            if (!error) setEditing(false)
            return error
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className={cn('flex items-center gap-3 px-5 py-3', !item.active && 'opacity-60')}>
      <CategoryIcon category={category} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
          <span className="truncate">{item.description}</span>
          {!item.active ? (
            <Badge variant="outline">Paused</Badge>
          ) : item.auto_add ? (
            <Badge variant="secondary">Auto</Badge>
          ) : (
            <Badge className="bg-brand-orange/20 text-brand-orange-ink">Ask first</Badge>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Monthly on the {ordinal(item.day_of_month)}
          {item.active && ` · Next: ${format(nextOccurrence(item), 'd MMM')}`}
        </p>
      </div>
      <p className={cn('text-sm font-extrabold whitespace-nowrap', item.type === 'income' ? 'text-primary' : 'text-foreground')}>
        {item.type === 'income' ? '+' : '−'}
        {formatRM(item.amount)}
      </p>
      <div className="flex">
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onToggle()
            setBusy(false)
          }}
          aria-label={item.active ? `Pause ${item.description}` : `Resume ${item.description}`}
          title={item.active ? 'Pause' : 'Resume'}
          className="text-muted-foreground hover:text-primary"
        >
          {item.active ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${item.description}`}
          title="Edit"
          className="text-muted-foreground hover:text-primary"
        >
          <Pencil />
        </Button>
        <Button
          onClick={onRemove}
          variant="ghost"
          size="icon"
          aria-label={`Delete ${item.description}`}
          title="Delete"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

// ---------- shown until the database has the new table ----------

function SetupNotice() {
  const [copied, setCopied] = useState(false)
  return (
    <SectionCard
      title="One-time setup needed"
      description="Recurring items need a new table in your Supabase database."
      icon={DatabaseZap}
      tone="orange"
    >
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Open your project in the Supabase dashboard.</li>
        <li>
          Go to <strong>SQL Editor → New query</strong>.
        </li>
        <li>
          Paste the SQL below and click <strong>Run</strong>, then refresh this page.
        </li>
      </ol>
      <div className="relative mt-4">
        <pre className="max-h-64 overflow-auto rounded-xl bg-brand-ink p-4 text-xs leading-relaxed text-brand-ivory">{migrationSql}</pre>
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(migrationSql)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            } catch {
              // clipboard blocked: the text can still be selected by hand
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy SQL'}
        </Button>
      </div>
    </SectionCard>
  )
}
